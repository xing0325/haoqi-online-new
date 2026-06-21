-- 触发器（spec §3.0 不可变列锁 + §5.3 据 roster 建 profile）。
-- 不可变列用 BEFORE UPDATE 触发器锁死，比 RLS with check 更稳。

-- ===== updated_at 维护 =====
create or replace function public.tg_touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch_updated before update on public.profiles
  for each row execute function public.tg_touch_updated_at();
create trigger post_touch_updated before update on public."Post"
  for each row execute function public.tg_touch_updated_at();

-- ===== Post：不可变列 + published_at 据 status 维护 =====
create or replace function public.tg_post_update_guard() returns trigger
  language plpgsql as $$
begin
  if new.space_type is distinct from old.space_type
     or new.space_id is distinct from old.space_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Post: 不可变列(space_type/space_id/author_id/created_at)不可修改';
  end if;
  if new.status = 'published' and old.status = 'draft' then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end $$;
create trigger post_update_guard before update on public."Post"
  for each row execute function public.tg_post_update_guard();

create or replace function public.tg_post_insert_published() returns trigger
  language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  if new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end $$;
create trigger post_insert_published before insert on public."Post"
  for each row execute function public.tg_post_insert_published();

-- ===== Comment：post_id/author_id/created_at 冻结 =====
create or replace function public.tg_comment_guard() returns trigger
  language plpgsql as $$
begin
  if new.post_id is distinct from old.post_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Comment: 不可变列(post_id/author_id/created_at)不可修改';
  end if;
  return new;
end $$;
create trigger comment_guard before update on public."Comment"
  for each row execute function public.tg_comment_guard();

-- ===== PostAsset：post_id 冻结 =====
create or replace function public.tg_asset_guard() returns trigger
  language plpgsql as $$
begin
  if new.post_id is distinct from old.post_id then
    raise exception 'PostAsset: post_id 不可修改';
  end if;
  return new;
end $$;
create trigger asset_guard before update on public."PostAsset"
  for each row execute function public.tg_asset_guard();

-- ===== ScheduleChange：除 deleted_at 外全冻结（只能撤回不能改写）=====
create or replace function public.tg_schedchange_guard() returns trigger
  language plpgsql as $$
begin
  if new.slot_id is distinct from old.slot_id
     or new.occurs_on is distinct from old.occurs_on
     or new.change_type is distinct from old.change_type
     or new.message is distinct from old.message
     or new.new_location is distinct from old.new_location
     or new.new_starts_at is distinct from old.new_starts_at
     or new.new_ends_at is distinct from old.new_ends_at
     or new.published_by is distinct from old.published_by
     or new.published_at is distinct from old.published_at then
    raise exception 'ScheduleChange: 只能撤回(改 deleted_at)，不能改写其它列';
  end if;
  return new;
end $$;
create trigger schedchange_guard before update on public."ScheduleChange"
  for each row execute function public.tg_schedchange_guard();

-- ===== CourseMembership：course_id/user_id 冻结 + 防降级/删除课程唯一 teacher =====
create or replace function public.tg_membership_guard() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.course_id is distinct from old.course_id or new.user_id is distinct from old.user_id then
      raise exception 'CourseMembership: course_id/user_id 不可修改';
    end if;
    if old.role = 'teacher' and new.role <> 'teacher'
       and (select count(*) from public."CourseMembership"
            where course_id = old.course_id and role = 'teacher') <= 1 then
      raise exception 'CourseMembership: 不能降级课程唯一的 teacher';
    end if;
    return new;
  end if;
  -- DELETE
  if old.role = 'teacher'
     and (select count(*) from public."CourseMembership"
          where course_id = old.course_id and role = 'teacher') <= 1 then
    raise exception 'CourseMembership: 不能删除课程唯一的 teacher';
  end if;
  return old;
end $$;
create trigger membership_guard before update or delete on public."CourseMembership"
  for each row execute function public.tg_membership_guard();

-- ===== profiles：非 admin 不能改 role/email/account_status/roster_ref（权限最致命单点）=====
create or replace function public.tg_profiles_guard() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.account_status is distinct from old.account_status
       or new.roster_ref is distinct from old.roster_ref then
      raise exception 'profiles: 只有 admin 能改 role/email/account_status/roster_ref';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- ===== 登录（auth.users 插入）时据 roster 建 profile（§5.3）=====
-- roster 查不到该 email → 不建 profile（陌生人不放行）。email 统一 lower(trim())。
create or replace function public.tg_handle_new_user() returns trigger
  language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  r public.roster%rowtype;
begin
  select * into r from public.roster where email = lower(trim(new.email));
  if found then
    insert into public.profiles (id, email, display_name, role, account_status, roster_ref)
    values (new.id, lower(trim(new.email)), r.display_name, r.role, 'invited', r.roster_ref)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();
