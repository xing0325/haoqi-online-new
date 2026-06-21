-- 行级权限（spec §3.1–§3.9）。所有表启用 RLS；未登录（auth.uid() 为 null）一律读不到业务数据。
-- 每条对外可读 select 路径都带 deleted_at is null（含软删除的表）。

alter table public.roster              enable row level security;
alter table public.profiles            enable row level security;
alter table public."Term"              enable row level security;
alter table public."Course"            enable row level security;
alter table public."CourseMembership"  enable row level security;
alter table public."ScheduleSlot"      enable row level security;
alter table public."ScheduleChange"    enable row level security;
alter table public."Post"              enable row level security;
alter table public."PostAsset"         enable row level security;
alter table public."Comment"           enable row level security;

-- ===== roster：仅 admin =====
create policy roster_select on public.roster for select using (public.is_admin());
create policy roster_insert on public.roster for insert with check (public.is_admin());
create policy roster_update on public.roster for update using (public.is_admin()) with check (public.is_admin());
create policy roster_delete on public.roster for delete using (public.is_admin());

-- ===== profiles =====
-- select：任一登录成员可读所有成员展示信息（社区互相看头像/名字）
create policy profiles_select on public.profiles for select using (auth.uid() is not null);
-- insert：仅 admin（正常由 auth.users 触发器以 definer 权限写入，绕过本策略）
create policy profiles_insert on public.profiles for insert with check (public.is_admin());
-- update：本人或 admin（role/email/account_status/roster_ref 由 tg_profiles_guard 锁死）
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles for delete using (public.is_admin());

-- ===== Term =====
create policy term_select on public."Term" for select using (auth.uid() is not null);
create policy term_insert on public."Term" for insert with check (public.is_admin());
create policy term_update on public."Term" for update using (public.is_admin()) with check (public.is_admin());
create policy term_delete on public."Term" for delete using (public.is_admin());

-- ===== Course =====
create policy course_select on public."Course" for select using (auth.uid() is not null);
create policy course_insert on public."Course" for insert with check (public.is_admin());
create policy course_update on public."Course" for update
  using (public.is_admin() or public.course_role(id) in ('teacher','assistant'))
  with check (public.is_admin() or public.course_role(id) in ('teacher','assistant'));
create policy course_delete on public."Course" for delete using (public.is_admin());

-- ===== CourseMembership（管成员仅限 course teacher 或 admin；insert/update 拆开防 upsert 提权）=====
create policy cm_select on public."CourseMembership" for select using (auth.uid() is not null);
create policy cm_insert on public."CourseMembership" for insert
  with check (public.is_admin() or public.course_role(course_id) = 'teacher');
create policy cm_update on public."CourseMembership" for update
  using (public.is_admin() or public.course_role(course_id) = 'teacher')
  with check (public.is_admin() or public.course_role(course_id) = 'teacher');
create policy cm_delete on public."CourseMembership" for delete
  using (public.is_admin() or public.course_role(course_id) = 'teacher');

-- ===== ScheduleSlot（只读层；调课不在这里改）=====
create policy slot_select on public."ScheduleSlot" for select using (auth.uid() is not null);
create policy slot_insert on public."ScheduleSlot" for insert with check (public.is_admin());
create policy slot_update on public."ScheduleSlot" for update using (public.is_admin()) with check (public.is_admin());
create policy slot_delete on public."ScheduleSlot" for delete using (public.is_admin());

-- ===== ScheduleChange（追加不覆写）=====
create policy schedchange_select on public."ScheduleChange" for select
  using (auth.uid() is not null and deleted_at is null);
create policy schedchange_insert on public."ScheduleChange" for insert
  with check (
    published_by = auth.uid()
    and exists (
      select 1 from public."ScheduleSlot" s
      where s.id = slot_id and public.can_post_course(s.course_id)
    )
  );
-- update 仅本人或 admin；tg_schedchange_guard 限定只能动 deleted_at（撤回）
create policy schedchange_update on public."ScheduleChange" for update
  using (published_by = auth.uid() or public.is_admin())
  with check (published_by = auth.uid() or public.is_admin());
create policy schedchange_delete on public."ScheduleChange" for delete using (public.is_admin());

-- ===== Post（本切片只覆盖 course 空间）=====
create policy post_select on public."Post" for select using (
  deleted_at is null and space_type = 'course' and (
    status = 'published'
    or author_id = auth.uid()
    or public.can_post_course(space_id)
  )
);
create policy post_insert on public."Post" for insert with check (
  space_type = 'course'
  and author_id = auth.uid()
  and public.can_post_course(space_id)
);
create policy post_update on public."Post" for update
  using (deleted_at is null and (author_id = auth.uid() or public.can_post_course(space_id)))
  with check (space_type = 'course' and (author_id = auth.uid() or public.can_post_course(space_id)));
create policy post_delete on public."Post" for delete using (public.is_admin());

-- ===== PostAsset（继承父帖可见性）=====
create policy asset_select on public."PostAsset" for select
  using (deleted_at is null and public.post_is_readable(post_id));
create policy asset_insert on public."PostAsset" for insert with check (
  asset_type = 'image' and exists (
    select 1 from public."Post" p
    where p.id = post_id and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
  )
);
create policy asset_update on public."PostAsset" for update
  using (exists (
    select 1 from public."Post" p
    where p.id = post_id and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
  ))
  with check (asset_type = 'image' and exists (
    select 1 from public."Post" p
    where p.id = post_id and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
  ));
create policy asset_delete on public."PostAsset" for delete using (public.is_admin());

-- ===== Comment（看得见这帖就能评；全员可评）=====
create policy comment_select on public."Comment" for select
  using (deleted_at is null and public.post_is_readable(post_id));
create policy comment_insert on public."Comment" for insert
  with check (author_id = auth.uid() and public.post_is_readable(post_id));
-- update：作者本人或 admin（软删/编辑正文）；tg_comment_guard 冻结 post_id/author_id/created_at
create policy comment_update on public."Comment" for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy comment_delete on public."Comment" for delete using (public.is_admin());
