-- 权限辅助函数（spec §3.0）。SECURITY DEFINER + 固定 search_path + 表名 schema 全限定；
-- execute 仅授 authenticated；函数只读、只用 auth.uid()，不接受能改变查询目标的危险参数。

create or replace function public.auth_role() returns text
  language sql stable security definer set search_path = pg_catalog, public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

create or replace function public.course_role(cid uuid) returns text
  language sql stable security definer set search_path = pg_catalog, public as $$
  select role from public."CourseMembership" where course_id = cid and user_id = auth.uid()
$$;

-- 可发帖/可管「内容」（teacher 与 assistant 一视同仁）；不可用于守 CourseMembership 写权（见 §3.4）。
create or replace function public.can_post_course(cid uuid) returns boolean
  language sql stable security definer set search_path = pg_catalog, public as $$
  select public.is_admin() or coalesce(public.course_role(cid) in ('teacher','assistant'), false)
$$;

-- 帖子可读性（单一函数，供 Post/PostAsset/Comment/Storage 复用；显式收口 space_type='course'）
create or replace function public.post_is_readable(pid uuid) returns boolean
  language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public."Post" p
    where p.id = pid
      and p.deleted_at is null
      and p.space_type = 'course'
      and (
        p.status = 'published'
        or p.author_id = auth.uid()
        or public.can_post_course(p.space_id)
      )
  )
$$;

-- 加固：撤销 public 的 execute，仅授 authenticated
revoke execute on function
  public.auth_role(),
  public.is_admin(),
  public.course_role(uuid),
  public.can_post_course(uuid),
  public.post_is_readable(uuid)
from public;

grant execute on function
  public.auth_role(),
  public.is_admin(),
  public.course_role(uuid),
  public.can_post_course(uuid),
  public.post_is_readable(uuid)
to authenticated;
