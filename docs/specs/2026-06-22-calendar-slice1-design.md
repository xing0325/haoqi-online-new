# 好奇 Online · 日历切片 1 设计 spec（地基 + 拖拽）

> 本切片把「我的一周」从只读周表，升级成基于 **FullCalendar** 的真互动日历：真事件数据模型 + 日/周/月视图 + 四种日历分层 + 完成/过期开关 + 拖拽/拉伸/点空白建/双击改/15min 吸附/冲突提示/撤销。
> 决策（已与负责人确认）：① 日历引擎用 **FullCalendar**；② DeepSeek agent 子系统**延后**独立立项；③ 第一切片范围 = **地基 + 拖拽**。

## 1. 范围

### 1.1 IN（本切片要做）
- **数据模型**：`Calendar`（私人 / 工作，归属，公开/私密）+ `Event`（真实事件 vs 计划时间块、状态、地点、软删除）。`课表` 仍用现有只读 `ScheduleSlot`，作为一个**只读图层**叠加进来。
- **日历页（取代现 `/schedule`）**：FullCalendar 渲染，**日 / 周 / 月**视图切换。
- **四种日历分层**（图例可勾选显隐）：
  - `课表`（只读，来自 ScheduleSlot，按 term 周期重复）—— **默认显示**
  - `私人`（个人本地安排，工作+生活）
  - `工作`（团队相关，本切片先只做本人创建/查看，指派/提醒留协作切片）
  - `全景` = 私人 + 工作 同时显示
  - 规则：**只有「课表」图层显示课程**；私人/工作默认不含课程，但用户可在图例里把「课表」一起勾上叠加查看（= 主动导入课程的轻量版）。
- **完成 / 过期开关**：两个 toggle —「显示已完成」（`status='done'`）、「显示已过期」（`ends_at < 现在`）。默认隐藏已完成、显示未过期。
- **真实事件 vs 计划时间块**：`kind` 字段 + 视觉区分（真实事件实色卡片；计划时间块半透明）。
- **直接操作（让它"活"）**：
  - 点空白新建（带预填起止时间的快速建表单）
  - 双击事件编辑、悬停快速预览（title+时间+地点）
  - 拖动改时间、拖到另一天改日期、拉伸改时长
  - **15 分钟吸附**；拖动时实时显示新时间；落到冲突时段给**冲突提示**；保存后给**撤销**（一次性 toast）
- **建/改表单**：标题、起止时间、全天、类型(事件/时间块)、地点、归属日历。
- 写操作走客户端 Supabase，权限由 RLS 兜底。

### 1.2 OUT（本切片明确不做，后续切片）
- **重复事件**（每周/每天 + "改一次 vs 整个系列"）—— 复杂度高，紧接着的切片 1.5 专做（用 FullCalendar rrule + 例外覆盖模型）。**注意：`课表` 的每周重复不算，它走 FullCalendar 内置 `daysOfWeek`，只读、无需例外模型。**
- 完整**生命周期状态流**（想法→草稿→待确认→已确认→报名中→进行中→已结束→已复盘 + 呼吸动效）——本切片 `status` 只做最小集 `draft / confirmed / done / cancelled`，全流程留「富事件」切片。
- **任务流**（停车场、deadline 标红、未完成滚明天、shutdown 总结、task↔event 联动、链到做事课）。
- **协作**（公开分享/发成帖、指派+提醒、Openings 可约时段、Proposals 候选时间投票）。`Event` 暂不含 `assignee_id`，到协作切片再加列。
- **富事件**（附件、会议链接识别、活动详情页）。
- **视觉层**（社区脉搏、空间/场地视图）。
- **Agent**（DeepSeek + 工具箱；日历自然语言建日程框）—— 本切片连轻量解析框都**先不做**，留 agent epic。

> 诚实铁律：以上 OUT 项若在 UI 出现入口，必须标「建设中」，不放假按钮。

## 2. 数据模型与 RLS

### 2.1 表

```text
Calendar
  id            uuid pk default gen_random_uuid()
  owner_id      uuid not null references profiles(id) on delete cascade
  name          text not null
  kind          text not null check (kind in ('personal','work'))
  color         text                      -- 可空，图例颜色（取纸感色板之一）
  visibility    text not null default 'private' check (visibility in ('private','public'))
  created_at    timestamptz not null default now()
  -- 每个用户首次进日历页时，惰性创建默认「私人」+「工作」各一本（前端检测无则建）

Event
  id            uuid pk default gen_random_uuid()
  calendar_id   uuid not null references Calendar(id) on delete cascade
  title         text not null
  starts_at     timestamptz not null
  ends_at       timestamptz not null check (ends_at >= starts_at)
  all_day       boolean not null default false
  kind          text not null default 'event' check (kind in ('event','timeblock'))
  status        text not null default 'confirmed' check (status in ('draft','confirmed','done','cancelled'))
  location      text
  created_by    uuid not null references profiles(id)
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()   -- 触发器维护
  deleted_at    timestamptz
  index (calendar_id), index (starts_at)
```

`课表` 不新建表：继续用 `ScheduleSlot`（只读层）。

### 2.2 RLS（沿用客户端 Supabase + 服务端兜底范式）
- **Calendar**
  - select：`owner_id = auth.uid()` 或 `visibility='public'`（且 `auth.uid()` 非空）
  - insert：`owner_id = auth.uid()`
  - update/delete：`owner_id = auth.uid()`
- **Event**
  - select：父 Calendar 可见（`exists(select 1 from Calendar c where c.id=calendar_id and (c.owner_id=auth.uid() or c.visibility='public'))`）且本行 `deleted_at is null`
  - insert：`created_by = auth.uid()` 且父 Calendar `owner_id = auth.uid()`（只能往自己的日历写）
  - update：父 Calendar `owner_id = auth.uid()`（软删走 update 置 deleted_at）
  - delete：不开放前端物理删（仅 admin 兜底）
- **不可变列触发器**：`Event` 冻结 `calendar_id`（防搬历）、`created_by`、`created_at`；`updated_at` 触发器维护。
- 未登录读不到（anon 已 revoke）。
- **负样本（进 RLS 测试）**：A 用户改/读 B 用户私密日历的 Event 被拒；普通用户改课表（ScheduleSlot）被拒（已有）。

## 3. 技术架构

- **引擎**：FullCalendar v6。为彻底回避 React 19 与 `@fullcalendar/react` 的 peer 依赖风险，**用 vanilla FullCalendar（`@fullcalendar/core` + `daygrid`/`timegrid`/`interaction` 插件）在一个 React `useEffect` 里实例化到 div ref**，不走 React 封装。静态导出（GitHub Pages）兼容：纯客户端。
- **页面**：`/schedule`（沿用路由，导航仍叫「我的一周」）整页换成 `<CalendarBoard/>`（client）。现有手写 time-grid 退役（它是过渡；FullCalendar 取代）。
- **取数**：登录后客户端按可见日历拉 `Event`（当前视图时间窗 `starts_at/ends_at` 范围查询）+ `ScheduleSlot`（active term）→ 转成 FullCalendar event 源：
  - 课表 slot → FullCalendar 事件用 `daysOfWeek + startTime/endTime + startRecur/endRecur`(term 起止)，`editable:false`，加只读样式类。
  - Event 行 → 普通 FullCalendar 事件，`editable:true`。
- **写**：拖拽/拉伸的 `eventDrop/eventResize` 回调 → `supabase.update` 写回 `starts_at/ends_at`；`dateClick`/选区 → 打开快速建表单 → `insert`。失败回滚（FullCalendar `info.revert()`）+ toast。
- **撤销**：每次拖拽/建后存一步「上一状态」，toast 里「撤销」按钮 5 秒内可回退（再写一次 Supabase）。
- **冲突**：落点与同图层已有事件时间重叠 → 提示（不强制阻止，给确认/撤销）。
- **主题**：FullCalendar 默认偏 SaaS；用 CSS 变量 + 覆盖（`--fc-*` 变量 + 局部样式）改成纸感（暖白、海军蓝、课程色、低饱和）。圆角克制（4–6px）、边框 0.5–1px、字号紧凑。
- **设计系统**：全局 token 复用 `app/globals.css`；FullCalendar 主题覆盖放 `components/calendar/calendar-theme.css`。组件逻辑放 `components/calendar/CalendarBoard.tsx`，取数放 `lib/data.ts`（新增 `getCalendars/getEvents/createEvent/updateEventTime/...`）。

## 4. UI / 交互

- 顶部：标题 +（视图切换 日/周/月）+（今天/上一周/下一周）+ 右侧两个 toggle（显示已完成 / 显示已过期）。
- 左侧（或顶部 chip）：**图例**，勾选显隐 课表 / 私人 / 工作（全景 = 都勾）。每本日历一个颜色点。
- 主区：FullCalendar。课表事件只读（浅底+左色条，灰一点的"只读"感）；私人/工作事件可拖拽；时间块半透明；`done` 置灰；`draft` 虚线边。
- 新建：点空白（周/日视图按时间，月视图按天）→ 弹快速表单（标题/起止/类型/地点/归属日历）→ 保存。
- 编辑：双击事件 → 同表单（带删除=软删）。
- 反馈：拖拽实时显示新时间；冲突提示；保存后撤销 toast；加载/失败态。
- 移动端：周/日视图可横向滚动；月视图自适应。

## 5. 关键裁决（与 handoff 风格一致：诚实、可逆）
1. **不在本切片做重复事件**（除课表的内置周重复）——避免 rrule + 例外模型的深坑拖慢"先上线"。紧接着的切片 1.5 专做。
2. **工作日历的指派/提醒延后**——本切片工作日历只能本人建/看，`assignee_id` 列都先不加，协作切片再加，避免空字段。
3. **vanilla FullCalendar in useEffect**——规避 React 19 封装兼容风险；若实测 `@fullcalendar/react` 在 React 19 下没问题，可改用封装（等价，纯实现细节）。
4. **退役手写 time-grid**——FullCalendar 覆盖其全部能力且更专业；课表的只读周视图由 FullCalendar 的 timeGridWeek + daysOfWeek 重现。

## 6. 验收（本切片"算做完"）
1. 登录后 `/schedule` 是 FullCalendar，日/周/月可切，今天/前后导航可用。
2. 图例勾选可显隐 课表/私人/工作；全景=都显示；只有课表层显示课程。
3. 课表事件只读（拖不动），私人/工作事件可拖动改时间、拉伸改时长、拖到别天改日期，**15 分钟吸附**，落点冲突有提示，保存后 5 秒可撤销，刷新后改动真的留在库里。
4. 点空白能建事件、双击能改、能软删；真实事件与时间块视觉不同；done 置灰、draft 虚线。
5. 「显示已完成/已过期」两开关生效。
6. RLS：A 改不了 B 的私密日历事件、改不了课表；负样本进测试。
7. 静态导出构建通过、部署 GitHub Pages 后登录可用；视觉是纸感不是默认 SaaS 蓝。

## 7. 文件结构（预计）
- `supabase/migrations/<ts>_calendar.sql` — Calendar/Event 表 + RLS + 触发器
- `lib/data.ts` — 新增 getCalendars / ensureDefaultCalendars / getEvents(range) / createEvent / updateEventTime / updateEvent / softDeleteEvent；课表→事件源转换 getScheduleAsEvents
- `lib/types.ts` — Calendar / CalEvent 类型
- `components/calendar/CalendarBoard.tsx` — 主组件（vanilla FullCalendar in useEffect + 图例 + 开关 + 建/改表单 + 撤销 toast）
- `components/calendar/calendar-theme.css` — 纸感主题覆盖
- `app/schedule/page.tsx` — 渲染 CalendarBoard
- 退役：`components/schedule/WeekSchedule.tsx`、`Schedule.module.css`（移除或留档）

## 8. 开放问题（可后续定，不挡本切片）
- 工作日历「链到做事课」的关联模型（等做事课空间真做时再定）。
- 公开日历「发布成帖」的形态（等本切片公开可见跑通后接帖子系统）。
- 重复事件例外模型细节（切片 1.5）。
