-- 日历切片 1.5：重复事件（RRULE + recurrence-id 例外模型）。
-- 给 Event 加 4 列 + 约束/索引 + 触发器扩展。RLS 不变（子行同受父 Calendar 门控）。
-- 角色：母事件 = rrule not null and series_id null；override 子行 = series_id+occurrence_start 非空且 status<>'cancelled'；
--       exception(删一次) = series_id+occurrence_start 非空且 status='cancelled'；普通单次 = 三者皆 null。

alter table public."Event"
  add column if not exists rrule text,
  add column if not exists recur_until timestamptz,
  add column if not exists series_id uuid references public."Event"(id) on delete cascade,
  add column if not exists occurrence_start timestamptz;

-- override/exception 子行检索
create index if not exists event_series_idx on public."Event"(series_id) where series_id is not null;
-- 一个系列里一次最多一条覆盖
create unique index if not exists event_override_uniq
  on public."Event"(series_id, occurrence_start) where series_id is not null;

-- series_id 与 occurrence_start 同生共死
alter table public."Event" drop constraint if exists event_series_pair_ck;
alter table public."Event" add constraint event_series_pair_ck
  check ((series_id is null) = (occurrence_start is null));

-- 母事件(有 rrule)不能同时是子行
alter table public."Event" drop constraint if exists event_master_not_child_ck;
alter table public."Event" add constraint event_master_not_child_ck
  check (not (rrule is not null and series_id is not null));

-- 触发器：在已冻结的 calendar_id/created_by/created_at 之外，再冻结 series_id/occurrence_start。
-- rrule/recur_until/starts_at/ends_at 仍可改（系列编辑/拆分用）。
create or replace function public.tg_event_guard() returns trigger language plpgsql as $$
begin
  if new.calendar_id is distinct from old.calendar_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.series_id is distinct from old.series_id
     or new.occurrence_start is distinct from old.occurrence_start then
    raise exception 'Event: calendar_id/created_by/created_at/series_id/occurrence_start 不可修改';
  end if;
  new.updated_at = now();
  return new;
end $$;
-- 触发器 event_guard 已绑定该函数，create or replace 即更新逻辑，无需重建 trigger。
