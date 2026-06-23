-- 多轨道排序：给 Event 加 sort_order（越小越靠上轨）。FC eventOrder 用它 → 用户可决定哪条日程在上轨/下轨。
-- 课表(ScheduleSlot)不在此表，渲染时按 0 处理。
alter table public."Event" add column if not exists sort_order int not null default 0;
