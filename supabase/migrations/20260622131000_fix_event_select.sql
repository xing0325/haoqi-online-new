-- 修：原 event_select 对所有人过滤 deleted_at is null，导致软删后连属主都读不到该行，
-- 而 PostgREST 在 UPDATE 后回读不到 → 报 "new row violates RLS policy"，软删失败。
-- 改为：未删行对 属主/公开 可见；已删行只对**日历属主**可见（供将来回收站；正常查询仍显式过滤 deleted_at）。

drop policy event_select on public."Event";
create policy event_select on public."Event" for select using (
  (deleted_at is null and exists (
    select 1 from public."Calendar" c
    where c.id = calendar_id and (c.owner_id = auth.uid() or c.visibility = 'public')
  ))
  or exists (
    select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()
  )
);
