# 日历切片 1（地基 + 拖拽）实现计划

> **For agentic workers:** 用 superpowers:executing-plans 逐任务执行；step 用 - [ ] 追踪。本计划由作者本人 inline 执行。

**Goal:** 把 `/schedule` 从只读周表升级成 FullCalendar 驱动的真互动日历：真事件模型 + 日/周/月 + 四图层 + 完成/过期开关 + 拖拽/拉伸/建/改/吸附/冲突/撤销。

**Architecture:** 静态前端 + 客户端 Supabase（RLS 兜底）。FullCalendar 用 vanilla core（`@fullcalendar/core` + daygrid/timegrid/interaction）在 React `useEffect` 里实例化，避开 React19 封装兼容问题。课表（ScheduleSlot）作只读图层用内置 `daysOfWeek` 周重复渲染；用户 Event 可拖拽，写回 Supabase。

**Tech Stack:** Next15 静态导出 / TypeScript / Supabase / FullCalendar v6 / pg(脚本)。

设计依据：`docs/specs/2026-06-22-calendar-slice1-design.md`。

---

## 文件结构
- `supabase/migrations/20260622130000_calendar.sql` — Calendar/Event 表 + 索引 + RLS + updated_at/不可变列触发器
- `lib/types.ts` — `Calendar`、`CalEvent`、`CalKind` 类型（追加）
- `lib/data.ts` — 追加：`getCalendars` / `ensureDefaultCalendars` / `getEventsInRange` / `createEvent` / `updateEventTime` / `updateEvent` / `softDeleteEvent` / `getScheduleAsRecurring`
- `components/calendar/CalendarBoard.tsx` — 主组件（FullCalendar 实例 + 图例 + 开关 + 建/改表单 + 撤销 toast）
- `components/calendar/calendar-theme.css` — 纸感主题覆盖（`--fc-*` + 局部）
- `app/schedule/page.tsx` — 渲染 `<CalendarBoard/>`
- `scripts/rls-check.mjs` — 追加日历负样本
- 退役：`components/schedule/WeekSchedule.tsx`、`Schedule.module.css`

---

## Task 1：DB 迁移 — Calendar / Event + RLS + 触发器

**Files:** Create `supabase/migrations/20260622130000_calendar.sql`

- [ ] **写迁移**（表 + 索引 + RLS + 触发器）

```sql
create table public."Calendar" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('personal','work')),
  color text,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now()
);
create index calendar_owner_idx on public."Calendar"(owner_id);

create table public."Event" (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public."Calendar"(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at >= starts_at),
  all_day boolean not null default false,
  kind text not null default 'event' check (kind in ('event','timeblock')),
  status text not null default 'confirmed' check (status in ('draft','confirmed','done','cancelled')),
  location text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index event_cal_idx on public."Event"(calendar_id);
create index event_range_idx on public."Event"(starts_at) where deleted_at is null;

alter table public."Calendar" enable row level security;
alter table public."Event" enable row level security;

create policy cal_select on public."Calendar" for select
  using (auth.uid() is not null and (owner_id = auth.uid() or visibility = 'public'));
create policy cal_insert on public."Calendar" for insert with check (owner_id = auth.uid());
create policy cal_update on public."Calendar" for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy cal_delete on public."Calendar" for delete using (owner_id = auth.uid());

create policy event_select on public."Event" for select using (
  deleted_at is null and exists (
    select 1 from public."Calendar" c where c.id = calendar_id
      and (c.owner_id = auth.uid() or c.visibility = 'public')));
create policy event_insert on public."Event" for insert with check (
  created_by = auth.uid() and exists (
    select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()));
create policy event_update on public."Event" for update using (
  exists (select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public."Calendar" c where c.id = calendar_id and c.owner_id = auth.uid()));

create function public.tg_event_guard() returns trigger language plpgsql as $$
begin
  if new.calendar_id is distinct from old.calendar_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Event: calendar_id/created_by/created_at 不可修改';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger event_guard before update on public."Event" for each row execute function public.tg_event_guard();
```

- [ ] **套用**：`node --env-file=.env.local scripts/db-apply.mjs 20260622130000` → 期望 ok
- [ ] **commit**：`git add supabase/migrations && git commit -m "feat(db): 日历 Calendar/Event 表 + RLS + 触发器"`

## Task 2：RLS 负样本（真库验证）

**Files:** Modify `scripts/rls-check.mjs`

- [ ] 追加：student 建自己的 Calendar + Event 成功；另一 student 读/改前者私密日历的 Event 被拒；改 Event.calendar_id 被触发器拒。
- [ ] 跑 `node --env-file=.env.local scripts/rls-check.mjs` → 期望全绿（含新负样本）
- [ ] commit

## Task 3：数据层

**Files:** Modify `lib/types.ts`, `lib/data.ts`

- [ ] types：
```ts
export type CalKind = "personal" | "work";
export type Calendar = { id: string; name: string; kind: CalKind; color: string | null; visibility: "private" | "public" };
export type CalEvent = {
  id: string; calendarId: string; title: string; startsAt: string; endsAt: string;
  allDay: boolean; kind: "event" | "timeblock"; status: "draft"|"confirmed"|"done"|"cancelled"; location: string | null;
};
```
- [ ] data：`getCalendars()`（本人 + 公开）、`ensureDefaultCalendars(userId)`（无则建「私人」personal +「工作」work）、`getEventsInRange(calendarIds, fromISO, toISO)`、`createEvent(...)`、`updateEventTime(id, startsAt, endsAt)`、`updateEvent(...)`、`softDeleteEvent(id)`、`getScheduleAsRecurring()`（ScheduleSlot → {daysOfWeek,startTime,endTime,title,color} 给 FullCalendar）。
- [ ] smoke：`scripts/data-smoke.mjs` 追加：登录后 ensureDefaultCalendars → 建一条 Event → getEventsInRange 读回 → 清理。跑通。
- [ ] commit

## Task 4：装 FullCalendar + CalendarBoard 骨架（日/周/月 + 课表只读层）

**Files:** Create `components/calendar/CalendarBoard.tsx`, `components/calendar/calendar-theme.css`; Modify `app/schedule/page.tsx`

- [ ] `npm i @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`
- [ ] CalendarBoard（client）：useEffect 里 `new Calendar(el, { plugins:[dayGrid,timeGrid,interaction], initialView:'timeGridWeek', headerToolbar:{left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay'}, slotDuration:'00:30:00', snapDuration:'00:15:00', nowIndicator:true, locale:'zh-cn', firstDay:1, allDaySlot:true })`。先只喂课表事件源（`getScheduleAsRecurring()`，editable:false）。挂载/卸载 destroy。
- [ ] `app/schedule/page.tsx` → `<CalendarBoard/>`。
- [ ] theme css：纸感覆盖（背景、边框、今日列、按钮、字号）。
- [ ] 验证：`npm run build` ✓；本地构建产物含 fullcalendar chunk。
- [ ] commit

## Task 5：Event 图层 + 图例 + 完成/过期开关

**Files:** Modify `components/calendar/CalendarBoard.tsx`

- [ ] 登录后 `ensureDefaultCalendars` + `getCalendars`；按当前视图时间窗 `getEventsInRange`。把 Event 转 FullCalendar 事件（按 calendar 上色；kind=timeblock → `classNames:['fc-timeblock']` 半透明；status=done → 灰；draft → 虚线）。
- [ ] 图例：课表 / 私人 / 工作 复选框（全景=私人+工作都勾）→ 控制各事件源显隐。只有课表层含课程。
- [ ] 两开关：显示已完成（含 status=done）、显示已过期（ends_at<now）→ `eventSourceFilter`/重新取数过滤。
- [ ] `datesSet` 回调：视图切换/翻页时按新窗口重新取 Event。
- [ ] 验证 build ✓；commit

## Task 6：拖拽 / 拉伸 / 建 / 改 / 吸附 / 冲突 / 撤销

**Files:** Modify `components/calendar/CalendarBoard.tsx`

- [ ] `eventDrop` / `eventResize`：仅对用户 Event 生效（课表 editable:false 天然挡）。回调里 `updateEventTime`；失败 `info.revert()` + toast。snapDuration 已 15min。
- [ ] `dateClick`（月）/ `select`（周日，拖选时间段）：打开快速建表单（标题/起止/类型/地点/归属日历）→ `createEvent` → 刷新。
- [ ] `eventClick`：用户事件打开编辑表单（改 / 软删）；课表事件 → 只读预览（或跳课程主页）。
- [ ] 冲突：建/拖落点与同图层已有事件重叠 → toast 提示（不强拦）。
- [ ] 撤销：拖拽/建后存上一状态，toast「撤销」5 秒内回退（再写一次）。
- [ ] 验证 build ✓；commit

## Task 7：退役旧周表 + 部署 + 线上验证

**Files:** Delete/retire `components/schedule/WeekSchedule.tsx` + `Schedule.module.css`

- [ ] 移除旧 import；确认 `/schedule` 只用 CalendarBoard。
- [ ] `npm run build` ✓、`npm test` ✓、`scripts/rls-check.mjs` 全绿、`scripts/data-smoke.mjs` 通过。
- [ ] 合并 main → 部署；线上登录验证：课表显示、建/拖/改/撤销、图层与开关、纸感主题。
- [ ] commit + 部署预览链接给用户。

---

## 自查
- **覆盖**：spec §1.1 IN 每条 → Task1-7 都有对应（模型/RLS=1,2；数据层=3；日周月+课表层=4；四图层+开关=5；拖拽建改吸附冲突撤销=6；退役旧表+部署=7）。OUT 项不在计划内 ✓。
- **类型一致**：CalEvent/Calendar 字段在 data 层与 CalendarBoard 一致；updateEventTime(id,startsAt,endsAt) 签名贯穿 Task3/6。
- **占位**：无 TODO/TBD；每任务有验证 + commit。
- **风险**：FullCalendar 在 React19 下用 vanilla core 规避封装 peer 问题（spec 裁决3）；若 vanilla 集成有坑，Task4 即暴露，可当场调。
