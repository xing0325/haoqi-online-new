# 好奇 Online · 日历切片 1.5 设计 spec（重复事件 + 滴答清单视图全套）

> 本切片两件事一起做：
> ① **重复事件**：每天/每周/每月/每年循环 + 「仅此次 / 此次及以后 / 整个系列」例外模型。
> ② **照搬滴答清单（TickTick）视图与视觉**：年(热力) / 月(chips+溢出) / 周 / 日 / 日程(list) 五视图 + 底部药丸视图切换 + 纸感马卡龙事件卡。
>
> **北极星（负责人定）**：**底层能力做满（供 DeepSeek Agent 用自然语言驱动），人类 UI 做精简。** 一切重复/例外能力收敛成一套「能力 API」，精简 UI 与未来 Agent 工具**调同一套**。
>
> **前置**：切片 1（地基 + 拖拽）已上线（见 `2026-06-22-calendar-slice1-design.md`）。本切片在其上扩展，**不推翻已锁决策**：FullCalendar / 客户端 Supabase / 静态 Pages / 课表只读 / Agent 延后。
>
> **参考素材**：`C:\chichu的平面设计\滴答清单日历视图学习\`（7 张 TickTick 截图，负责人指定"全方位照搬"，其美学与本站纸感兼容）。

---

## 1. 范围

### 1.1 IN（本切片要做）

**A. 重复事件（核心）**
- `Event` 表扩展 4 列：`rrule` / `recur_until` / `series_id` / `occurrence_start`。
- 重复规律**底层全支持 RFC 5545 RRULE**（每天/每周多选周几/每月按号/每年/每 N 间隔/COUNT/UNTIL）；**人类 UI 只露精简档**。
- 例外模型（recurrence-id 范式）：**改一次** = override 子行；**删一次** = `status='cancelled'` 子行。
- 三种作用范围：**仅此次 / 此次及以后 / 整个系列**（含系列拆分 split）。
- 客户端展开器（`rrule.js`）：按当前视图时间窗算出实例 + 套例外 → 喂给 FullCalendar 成普通可拖事件。
- **能力 API**（`lib/data.ts` + `lib/recurrence.ts`）：精简 UI 与未来 Agent 共用同一套写接口。

**B. 滴答清单视图全套**
- **五视图**：年（multiMonth + 个人忙碌度热力）、月（dayGrid，chips + `+N` 溢出）、周（timeGrid）、日（timeGrid）、日程（list）。
- **底部漂浮「药丸」视图切换条**（年/月/周/日/日程；当前实色高亮）。双周/多日为**可选** custom-duration view。
- **视觉语言照搬 TickTick（纸感兼容）**：马卡龙柔色事件卡、圆角、轻边框、柔阴影、大留白。
- **日程视图的圆形勾选** = 切换 `status='done'`（任务完成手感，呼应未来任务流）。
- **年视图热力**：按当天**本人**事件数深浅着色（个人忙碌度；社区版留后）。
- **小天气云装饰**（纯装饰、不接真天气、可关）。

**C. 质量**：RLS 负样本（改不了别人系列）、真库 smoke、`npm run build`（静态导出）+ `npm test` 过、部署 GitHub Pages。

### 1.2 OUT（本切片明确不做，后续切片）
- **到点提醒通知**（要推送/邮件通道，未建）→ 留 Agent / 通知切片；模型给它留好。
- **Agent 对话框本体**（但能力 API 给它留好接口）→ Agent epic。
- **社区脉搏**（跨用户聚合公开事件的热力/徽章/波形）→ 本切片年热力只算"本人"；社区版后续视觉切片。
- **课表改造**（仍用内置 `daysOfWeek` 只读，不进重复模型）。
- **任务流 / 协作 / 富事件 / 完整生命周期状态流** → 各自后续切片。

> **诚实铁律**：OUT 项若在 UI 露入口，必须标「建设中」，不放会假提交的按钮。

---

## 2. 视觉语言（照搬 TickTick，与纸感兼容）

| 元素 | 规则 |
|---|---|
| 底子 | 复用 `globals.css` token：暖白 `--paper` 背景、`--ink/--navy` 文字、黄/珊瑚/浅蓝/薄荷绿语义色。大留白、表头淡、网格线极淡。 |
| 事件卡 | 浅底（`TINT`）+ 同色系左色条/边 + 深色文字（沿用切片1 的可读范式，把 `TINT` 扩成完整马卡龙板）。圆角 6px、边框 0.5–1px、内边距紧凑、字号 12–13。 |
| 今天 | 当天列/格淡高亮；此刻红线（切片1 已有）。 |
| chip 溢出 | 月视图每天排满 → `+N 更多` pill；点当天数字或 `+N` 弹"当天全部"popover。 |
| 日程 list | 行 = `[时间] [圆形勾选 ○/●] [色点] [标题 · 地点]`；`done` 行勾选填实、标题置灰 + 删除线。 |
| 底部药丸条 | 居中漂浮、全圆角、当前视图实色高亮、其余浅；`年 / 月 / 周 / 日 / 日程`。 |
| 年视图热力 | 12 月缩略；当天底色按本人事件数 4 档（0 / 1–2 / 3–4 / 5+）由浅到深（`--navy` 低透叠加）。 |
| 天气云 | 表头右上一个柔和 SVG 云（纯装饰）；可在开关里关。默认开、极轻。 |
| 暗色 | 本切片**至少不破坏**；完整暗色随全站暗色一起后做。 |

---

## 3. 数据模型与迁移

新迁移 `supabase/migrations/20260623120000_calendar_recurring.sql`，`alter table "Event"` 增列：

```text
rrule            text          -- RFC5545 RRULE 串(不含 DTSTART)，null = 不重复
recur_until      timestamptz   -- 末次出现起始(范围查询剪枝)；null = 无限。COUNT 型写入时算出末次填入
series_id        uuid references "Event"(id) on delete cascade  -- override/exception 子行 → 母事件；其它 null
occurrence_start timestamptz   -- 子行覆盖的"那次"的原始起始(recurrence-id)；其它 null
```

**行角色判定**
- **母事件 (series master)** = `rrule is not null and series_id is null`
- **override 子行 (改一次)** = `series_id is not null and occurrence_start is not null and status <> 'cancelled'`
- **exception (删一次)** = `series_id is not null and occurrence_start is not null and status = 'cancelled'`
- **普通单次** = `rrule / series_id / occurrence_start` 三者皆 null

**约束 / 索引**
- `create index event_series_idx on "Event"(series_id) where series_id is not null;`
- `create unique index event_override_uniq on "Event"(series_id, occurrence_start) where series_id is not null;`（一次最多一条覆盖）
- `check (( series_id is null ) = ( occurrence_start is null ))`（同生共死）
- `check (not (rrule is not null and series_id is not null))`（母事件不能同时是子行）

**触发器**：`tg_event_guard` 扩展冻结列 → 在已冻结的 `calendar_id / created_by / created_at` 之外，再冻结 `series_id`、`occurrence_start`（建后不可改）。`rrule / recur_until / starts_at / ends_at` 仍可改（系列编辑用）。

**RLS**：策略**不变**——母事件、子行都带 `calendar_id`，沿用切片1 的 `event_select / event_insert / event_update`（按父 `Calendar` 归属/公开门控）。
- 写子行 `insert` 仍受 `event_insert`（`created_by = auth.uid()` 且父日历属己）约束 → A **无法**给 B 的系列加 override/exception。
- 负样本（进测试）：A 改 B 母事件被拒；A 给 B 系列加子行被拒；改课表被拒（已有）。

---

## 4. 重复展开与例外（客户端纯函数，`rrule.js`）

`lib/recurrence.ts`（纯函数、可单测）：构造/解析 RRULE、展开、套例外、人话预览、算 `recur_until`。

**取数** `getEventsForWindow(calendarIds, fromISO, toISO)`（在 `lib/data.ts`，取代旧 `getEventsInRange` 的调用点）：
1. **普通单次**：`Event` 三列皆 null、`deleted_at` null、与窗相交（沿用旧逻辑：`starts_at < to and ends_at > from`）。
2. **母事件**：`rrule is not null and series_id is null and deleted_at is null and starts_at <= to and (recur_until is null or recur_until >= from)`。
3. **子行**：`series_id in (母 ids) and deleted_at is null`（override + exception 都取）。

**展开算法**
- 每个母事件：`rrule.js` 以 `dtstart = master.starts_at` 解析 `rrule` → `between(from, to, inclusive)` 得每次起始 `occ`。
- `duration = master.ends_at − master.starts_at`；实例 `end = occ + duration`。
- 套子行（按 `occurrence_start` 匹配 `occ`）：
  - exception(cancelled) → **跳过**该 occ。
  - override → 用子行的 `starts_at/ends_at/title/location/kind/status` 渲染（occ 被替换）。
  - 否则用母事件字段渲染。
- **被移出窗的 override**：override 的 `occurrence_start` 在窗外、但其新 `starts_at` 在窗内（被拖进视野）→ 也要渲染。故"取子行"按 `occurrence_start ∈ 窗` **或** `starts_at ∈ 窗` 取并集，按 `(seriesId, occurrence_start)` 去重。
- **合成 FullCalendar event**：
  - 普通单次：`id = row.id`。
  - 重复实例：`id = \`${masterId}::${occISO}\``，`extendedProps = { seriesId, occurrenceStart, overrideId | null, isRecurring: true, calendarId, kind, status, location }`。
- 冲突检测 `overlaps()` / `eventsRef`：持"展开后的实例数组"，逻辑不变。

---

## 5. 编辑 / 拖拽 / 删除的作用范围（能力 API）

**能力 API**（`lib/data.ts`，UI 与 Agent 共用，全部走客户端 Supabase + RLS）：

| 函数 | 作用 |
|---|---|
| `createEvent(input)` | 扩展：`input.recurrence?: { rrule, until? }`；`recur_until` 由 `until` 或 COUNT 末次算出 |
| `updateSeries(masterId, patch)` | **整个系列**：改母事件字段 / rrule / duration |
| `updateOccurrence(masterId, occurrenceStartISO, patch)` | **仅此次**：upsert override 子行 |
| `cancelOccurrence(masterId, occurrenceStartISO)` | **删此次**：upsert `status='cancelled'` 子行 |
| `splitSeries(masterId, fromOccurrenceISO, patch)` | **此次及以后**：① 母 rrule 加 `UNTIL = fromOcc 前一刻` + 重算 `recur_until`；② 新建母事件（rrule 同源、`dtstart = fromOcc`、应用 patch）；③ 旧系列 `occurrence_start >= fromOcc` 的子行**删除**（v1 简化）。返回新 `masterId` |
| `deleteSeries(masterId)` | **整系列软删**：母 `deleted_at`（子行随父 `on delete cascade` 不适用软删 → 一并 update `deleted_at`） |

普通单次沿用现有 `createEvent / updateEvent / updateEventTime / softDeleteEvent`。

**拖拽/拉伸一个重复实例** → 弹「作用范围」3 选 → 映射：
- 仅此次 → `updateOccurrence`（拖后的新起止）
- 此次及以后 → `splitSeries`（patch = 新起止 / 相对偏移）
- 整个系列 → `updateSeries`（按 delta 平移母 `dtstart` + 维持 rrule；若拖动改了星期，`BYDAY` 同步）

**双击编辑**重复实例 → 表单，保存时同样问作用范围；**删除**按钮亦问。
**非重复事件**：行为同切片1，不弹范围。

**撤销 toast**
- 仅此次 / 删此次：撤销 = 删 / 恢复对应子行（可逆，保留撤销按钮）。
- 系列 / 拆分：可逆较重。v1 存一份"编辑前快照"，撤销 = 写回旧 rrule/字段（拆分撤销 = 删新母 + 恢复旧母 UNTIL）。若实现成本过高，系列类**先不带撤销按钮**（toast 仍提示"已更新整个系列"），文档标注，留后补。

---

## 6. UI / 交互

### 6.1 视图与切换
- FullCalendar 注册新插件：`@fullcalendar/list`、`@fullcalendar/multimonth`。`views`：`multiMonthYear`(年)、`dayGridMonth`(月)、`timeGridWeek`(周)、`timeGridDay`(日)、`listWeek`/`listMonth`(日程)。
- 顶部 `headerToolbar`：`left = prev,next today`；`center = title`；`right = ''`（视图切换移到底部药丸）。
- **底部药丸条**（自绘 React 组件，调 `calendar.changeView`）：`年 月 周 日 日程`；当前高亮、纸感、漂浮居中。
- 双周/多日（**可选**）：FC custom view（`duration:{weeks:2}` / `{days:3}`）；时间紧则留下一迭代（文档标注）。

### 6.2 重复选择器（人类精简档）
建/改表单加「重复」行：下拉 `[不重复 / 每天 / 每周 / 每月 / 每年]`
- **每周**：展开 7 个周几圆点（默认勾起始日那天），可多选 → `BYDAY`。
- **每月**：默认"按号数"（`BYMONTHDAY = 起始日号`）。
- **每年**：按起始日 月+日。
- **结束**：`[永不 / 到某天(date) / 重复 N 次(count)]`。
- **间隔(每 N)**：UI 默认 1，**不露**；底层 rrule 支持 `INTERVAL`（Agent 可设）。
- 选了重复后，表单底显**人话预览**：如"每周一、三 19:00，到 2026-12-31"。

### 6.3 作用范围弹窗
小模态：标题"这是一个重复日程"，三按钮 `仅此次 / 此次及以后 / 整个系列`（+取消）。删除复用同弹窗、文案改"删除"。

### 6.4 事件视觉
- 重复实例左上角小 `↻` 角标。
- 真实事件实色描边/浅底；时间块半透明；`done` 置灰 + 删除线（list 里勾选实心）；`draft` 虚线（沿用切片1，对齐马卡龙板）。
- 月视图 chip 溢出 `+N`；点当天数字 / `+N` 弹当天 popover。

---

## 7. 依赖
新增（皆纯客户端、静态导出 OK、**不引** `@fullcalendar/react`，继续 vanilla in `useEffect` 规避 React19 peer）：
- `rrule` ^2.8 — 重复计算/展开。
- `@fullcalendar/list` ^6.1 — 日程视图。
- `@fullcalendar/multimonth` ^6.1 — 年视图。

---

## 8. 文件结构
- `supabase/migrations/20260623120000_calendar_recurring.sql` — 4 列 + 约束/索引 + 触发器扩展。
- `lib/recurrence.ts`（新）— RRULE 构造/解析、`expandSeries(window)`、`mergeOverrides`、`describeRrule`(人话)、`computeRecurUntil`。纯函数，单测覆盖。
- `lib/data.ts` — `getEventsForWindow`（取代/包住 `getEventsInRange`）；能力 API：`updateSeries / updateOccurrence / cancelOccurrence / splitSeries / deleteSeries`；`createEvent` 扩展 `recurrence`。
- `lib/types.ts` — `CalEvent` 加重复字段；新增 `Recurrence`、`EditScope = 'this'|'thisAndFuture'|'all'`、FC 实例合成类型。
- `components/calendar/CalendarBoard.tsx` — 注册新插件/视图、底部药丸、重复选择器、作用范围弹窗、`↻` 角标、`+N` 溢出 popover、list 勾选、年热力 `dayCellDidMount`。
- `components/calendar/calendar-theme.css` / `Calendar.module.css` — 马卡龙板、药丸条、list、年热力、天气云、popover。
- `scripts/recurring-smoke.mjs`（新）— 真库：建系列 → 展开 → override/exception/split → 跨用户拒绝。
- `lib/recurrence.test.ts`（新，vitest）。

---

## 9. RLS / 测试 / 验收

**RLS 负样本**（进 `rls-check.mjs` 或 `recurring-smoke.mjs`）
- A 给 B 的系列 insert override/exception → 拒。
- A update B 的母事件 → 拒。
- 改课表（ScheduleSlot）→ 拒（已有）。

**单测**（vitest, `lib/recurrence`）
- 每周多选周几展开正确；`UNTIL` / `COUNT` 边界；override 替换；exception 跳过；split 前后两段正确；`describeRrule` 人话正确。

**真库 smoke**（`recurring-smoke.mjs`）：建"每周三"系列 → 某周 override / cancel / split → 重新展开断言。

**验收（"算做完"）**
1. 建"每周三 19:00 排练"，年/月/周/日/日程**五视图**都正确重复显示，底部药丸切换顺滑。
2. 拖某周到周四 → 弹范围 → **仅此次**只动那周（刷新仍在）；**整个系列**全变周四；**此次及以后**从那周起变。
3. 删一次问范围，cancel 只删那次。结束 `到某天 / N 次` 生效。
4. 月视图 chip 溢出 `+N` 可展开；日程视图圆圈勾选切换 `done`（置灰）。
5. 年视图按本人当天事件数深浅着色。
6. RLS：A 改不了 B 系列；负样本进测试。
7. `npm run build`（静态导出）过、`npm test` 过、smoke 过、部署 Pages 登录可用、视觉是**纸感马卡龙**不是默认 SaaS 蓝。

---

## 10. 开放问题 / v1 已知简化（不挡本切片）
- **整个系列改时间后的旧 override 错位**：`updateSeries` 改了起止时间，旧的 per-occurrence override（按旧 `occurrence_start` 锚定）可能不再匹配新生成的 occ。v1 **容忍**（编辑整系列时间同时又有单次覆盖很少见）；可选在 `updateSeries` 改时间时清空该系列 override，留后定。
- 系列编辑/拆分的**撤销深度**（v1 可先弱化，见 §5）。
- `splitSeries` v1 **丢弃**旧系列里 `occurrence_start >= 拆分点` 的 override 子行（见 §5）。
- **双周/多日**视图是否本切片上（§6.1，标可选）。
- **天气云**是否接真天气（v1 纯装饰）。
- 年热力升级为**社区脉搏**（跨用户公开聚合）——后续视觉切片。
- **Agent 对话框**对接能力 API 的协议——Agent epic。
