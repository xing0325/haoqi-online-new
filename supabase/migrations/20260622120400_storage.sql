-- Storage 对象 RLS（spec §3.10）。私有 bucket + storage.objects 策略，
-- 草稿帖图片不被任意成员直链拿到（绕过草稿收口）。约定 storage_key = posts/{postId}/{filename}。

-- 私有 bucket
insert into storage.buckets (id, name, public)
values ('post-assets', 'post-assets', false)
on conflict (id) do update set public = false;

-- 从对象 path 解析 postId（第 2 段）
create or replace function public.storage_post_id(object_name text) returns uuid
  language sql immutable set search_path = pg_catalog, public as $$
  select nullif((string_to_array(object_name, '/'))[2], '')::uuid
$$;
revoke execute on function public.storage_post_id(text) from public;
grant execute on function public.storage_post_id(text) to authenticated;

-- SELECT：复用 post_is_readable（草稿仅作者/负责人/admin 可读）
create policy post_assets_select on storage.objects for select to authenticated
  using (
    bucket_id = 'post-assets'
    and public.post_is_readable(public.storage_post_id(name))
  );

-- INSERT/UPDATE/DELETE：要求对该 post 有写权（本切片无上传 UI，主要走 admin/seed，但策略仍设）
create policy post_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public."Post" p
      where p.id = public.storage_post_id(name)
        and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
    )
  );
create policy post_assets_update on storage.objects for update to authenticated
  using (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public."Post" p
      where p.id = public.storage_post_id(name)
        and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
    )
  );
create policy post_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-assets'
    and exists (
      select 1 from public."Post" p
      where p.id = public.storage_post_id(name)
        and (p.author_id = auth.uid() or public.can_post_course(p.space_id))
    )
  );
