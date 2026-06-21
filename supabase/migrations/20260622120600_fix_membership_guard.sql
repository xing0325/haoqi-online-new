-- 修：membership_guard 原来 BEFORE UPDATE OR DELETE，DELETE 分支「防删课程唯一 teacher」
-- 会在「删课级联删 CourseMembership」时触发，导致课程删不掉。
-- 改为只在 UPDATE 时守（冻结 course_id/user_id + 不能把唯一 teacher 降级）；DELETE 不再拦。

create or replace function public.tg_membership_guard() returns trigger
  language plpgsql as $$
begin
  if new.course_id is distinct from old.course_id or new.user_id is distinct from old.user_id then
    raise exception 'CourseMembership: course_id/user_id 不可修改';
  end if;
  if old.role = 'teacher' and new.role <> 'teacher'
     and (select count(*) from public."CourseMembership" where course_id = old.course_id and role = 'teacher') <= 1 then
    raise exception 'CourseMembership: 不能降级课程唯一的 teacher';
  end if;
  return new;
end $$;

drop trigger if exists membership_guard on public."CourseMembership";
create trigger membership_guard before update on public."CourseMembership"
  for each row execute function public.tg_membership_guard();
