# 好奇 Online · 日历模块 — 给下一个 Claude 的交接书

> 你接手「好奇 Online」的**日历模块**。先完整读完本文件再动手。
> 这不是从零开始：登录、首页、课程空间、日历切片 1 都已上线并接了真数据。你的任务是**继续把日历愿景一切片一切片做下去**。

---

## 0. 先读这些（按顺序）

1. 本文件（HANDOFF_CALENDAR.md）
2. `HANDOFF_TO_CLAUDE.md`（产品事实来源 / 视觉与权限铁律 / 别被旧废案带偏）
3. `docs/specs/2026-06-22-calendar-slice1-design.md`（日历切片 1 设计 spec）
4. `docs/plans/2026-06-22-calendar-slice1.md`（切片 1 实现计划）
5. 你的长期记忆里的 `project_haoqi_online.md`、`feedback_deploy_pages_not_localhost.md`

**唯一可信来源**：当前仓库代码 + 上述文档 + 用户在新线程里之后明确说的话。忽略任何旧"好奇 Online"会话。

---

## 1. 一句话 + 现状

- **产品**：好奇学习社区的线上日常空间。Next.js(App Router) **静态导出** + **客户端 Supabase**（安全全靠数据库 RLS）+ **GitHub Pages**。
- **线上**：https://xing0325.github.io/haoqi-online-new/
- **仓库**：`github.com/xing0325/haoqi-online-new`（**public**）。工程 `C:\Users\david\haoqi-online`。
- **分支**：一直在 `feat/first-slice-scaffold` 上做，自合到 `main` 触发部署。`feat` 与 `main` 内容已同步。你可以继续在 `feat` 上做，或从 `main` 切新分支。
- **已上线（全接真数据）**：邮箱密码登录+角色 / 首页仪表盘(今天的课·调课横幅·课程动态流) / 课程空间(列表→主页→详情→评论→老师发帖) / **我的一周日历(切片1)**。信用积分·阅读·大家在干嘛=诚实占位。

---

## 2. 架构与铁律（必须遵守，别推翻）

- **静态导出** `output:'export'` + `basePath:'/haoqi-online-new'`。**不用 Next 服务端能力**（server component 取数 / server action / middleware）。一切交互在客户端 + Supabase 客户端调用，权限由 **RLS** 兜底。
- **部署**：push `main` → GitHub Actions 自动 build + 部署 Pages。CI 构建的 `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` 来自 **gh 仓库 variables**（`.github/workflows/deploy.yml`）。
- **纯前端一律 GitHub Pages，别用 localhost**（用户离开 localhost 就掉）。改完 web → 部署 → 给线上**绝对 URL（单独一行）**。
- **动态内容用查询参数路由**（`/course?id=`、`/post?id=`，客户端读参数），**不用 `[id]` 动态段**（静态 Pages 对构建时未知的 id 会 404）。
- **诚实占位**：没接后端的 UI 必须标「建设中」，不放会假提交的按钮。示例数据不当真。
- **视觉**：纸感（暖白 `--paper` / 海军蓝 `--ink/--navy` / 黄·珊瑚·浅蓝·薄荷绿语义色）。别引臃肿组件库抹平；圆角克制、边框轻。

---

## 3. 本机开发（无 Docker / 无 supabase CLI）

- Supabase 项目 ref `equyybkxooqkarywgugd`。**keys 在 `.env.local`（已 gitignore）**，含 anon + **service_role + DB 密码**——**绝不提交、绝不外传、绝不写进任何文档**。新 session 在本机能直接读 `.env.local`。
- **套迁移**（pg 直连云库，本机有 IPv6 直连可用；迁移 append-only）：
  - 全部：`node --env-file=.env.local scripts/db-apply.mjs`
  - 只套单个：`node --env-file=.env.local scripts/db-apply.mjs 20260622130000`（传文件名片段）
- **构建/测试**：`npm run build`（静态导出，过了才算编译通过）、`npm test`（vitest）。
- **本地 dev**（**仅自己调试用，别给用户**）：global `.claude/launch.json` 有 `haoqi-dev`（端口 3216）；用 preview MCP 工具调试 DOM。dev 模式 basePath 为空、走 root。
- **部署**：在 `feat` 提交 → `git checkout main` → `git merge feat/first-slice-scaffold --ff-only` → `git push origin main` → `gh run watch <id>` → 验证线上 → `git checkout feat/first-slice-scaffold`。
- **验证脚本**（都 `node --env-file=.env.local scripts/<x>.mjs`）：
  - `rls-check.mjs` — RLS 负样本（学生不能自提 admin/看草稿/越权发帖等，**真库 10/10**）
  - `data-smoke.mjs` — 首页/课程读查询
  - `calendar-smoke.mjs` — 日历数据层 + 跨用户拒绝（**9/9**）
  - `seed.mjs` — 演示用户/课程/课表/帖子/评论
  - `seed-events.mjs` — 给演示账号灌私人/工作日历事件
  - `check-cal.mjs` / `clean-junk.mjs` — 调试/清理
- **演示账号**（密码 `haoqi2026`，已在 seed.mjs，非机密）：`chichu@haoqi.online`(admin) / `kiki@`(teacher) / `linyuan·siqi·yueyue@`(student)。登录=邮箱+密码（魔法链接要配 Supabase Site URL，未做）。

---

## 4. 日历模块现状（切片 1 已上线）

- **引擎**：FullCalendar v6（`@fullcalendar/core` + `daygrid`/`timegrid`/`interaction`，**vanilla**，在 React `useEffect` 里 `new Calendar(el, opts)`，避开 React19 封装的 peer 依赖坑）。
- **文件**：
  - `components/calendar/CalendarBoard.tsx` — 主组件（FC 实例 + 图例 + 开关 + 建/改表单 + 撤销 toast）
  - `components/calendar/calendar-theme.css` — `--fc-*` 纸感主题覆盖
  - `components/calendar/Calendar.module.css` — 外围布局/表单/toast
  - `app/schedule/page.tsx` → 渲染 `<CalendarBoard/>`
  - `lib/data.ts` — 日历取数：`getCalendars/getMyCalendars/ensureDefaultCalendars/getEventsInRange/createEvent/updateEventTime/updateEvent/softDeleteEvent/getScheduleAsRecurring`
  - `lib/types.ts` — `Calendar / CalEvent / ScheduleRecurring`
- **数据表**（`supabase/migrations/20260622130000_calendar.sql` + `131000_fix_event_select.sql`）：
  - `Calendar`(owner_id, name, kind `personal|work`, color, visibility `private|public`)
  - `Event`(calendar_id, title, starts_at, ends_at, all_day, kind `event|timeblock`, status `draft|confirmed|done|cancelled`, location, created_by, deleted_at)
  - **课表不在此表**：仍用只读 `ScheduleSlot`，`getScheduleAsRecurring()` 转成 FullCalendar `daysOfWeek` 重复源叠加（`editable:false`）。
- **已实现**：日/周/月切换、今天/翻页、此刻红线、图例显隐（课表/私人/工作，全景=都显示）、显示已完成/已过期开关、单击空白建(`dateClick`)+拖选建(`select`)、双击改、拖拽改时间、拉伸改时长（15min 吸附）、冲突提示、撤销 toast；真实事件实色/时间块半透明/done 置灰/draft 虚线。
- **RLS**：本人 CRUD 自己的日历/事件；公开日历可读；跨用户拒绝；软删行属主可见（见下"坑"）。课表只读、改课表被拒。
- **只有「课表」图层显示课程**；私人/工作默认不含课程，可在图例里勾「课表」叠加查看。
- **未做 = 后续切片**（见 spec §1.2 与第 6 节愿景）。**最该先做：切片 1.5 重复事件**（rrule + 例外"只改这次 vs 整个系列"）。

---

## 5. 关键学习 / 坑（省时间，照着避）

- **PostgREST 批量 insert**：数组里对象键不一致 → 它按所有行键的**并集**建列、缺键填 **NULL（不走默认值）** → not-null 约束报错。**批量插入要每行键一致**（如显式给每条都带 `status`）。单条 insert 正常走默认值，不受影响。
- **RLS 软删 + 回读**：UPDATE 把一行改成 SELECT 策略看不见的状态（如置 `deleted_at`）时，PostgREST 回读不到该行 → 报「new row violates row-level security policy」。**解法**：让属主能 SELECT 自己的**已删行**（`131000_fix_event_select.sql`：未删行对属主/公开可见，已删行只对属主可见；正常查询仍显式 `.is('deleted_at', null)` 过滤）。
- **FullCalendar**：vanilla core 装进 useEffect；课表用 `daysOfWeek`（**0=周日**，本库 weekday 1=周一要转）、`editable:false`；**用户事件 `editable:true` 才会有 `fc-event-draggable`/`fc-event-resizable` 类**。事件用「浅底 + 色边 + 深色文字」始终可读（见 CalendarBoard 的 `TINT` 表）。v6 CSS 自动注入，无需手动 import。
- **"日历拖不动"的真相**（用户报过）：新用户私人/工作日历**为空** → 日历上只剩课表（只读）→ 没东西可拖。**先 `seed-events.mjs` 或引导用户建事件**。课表只读是**对的**（官方课表，改它走调课/admin）。
- **GitHub Pages**：免费版要 **public 仓库**；CI 注入 `NEXT_PUBLIC_*` 用 gh repo **variables**。`actions` 的 Node20 deprecation 警告无害。
- **截图/可视化**：本机 chromium 装不上（国内网络）。调试用**本地 dev + preview MCP 工具**（`preview_eval`/`preview_console_logs`/`preview_snapshot`）。注意 `preview_fill` **不触发 React onChange**——用原生 value setter + 派发 `input` 事件才能更新受控组件状态。给用户看 UI 就直接部署 Pages 让他开。

---

## 6. 日历完整愿景（用户原文，原样保留）

> 以下是用户的原始需求，逐字保留。做切片时回来对照。

【日历模块-修改
1.ui
日 周 月视图切换，task联动，"显示以完成的活动/显示已过期的活动"


2.分为课表（随季度or突发事件更新），全景日历，私人日历与工作日历。课表显示当周课程和活动安排（后端可以编辑管理活动，推松更新）。不过也只有课表上面会显示课程，别的日历上默认不显示课程，但是可以主动导入课程（毕竟需要规划私人日历和工作日历的同学都不咋上课，都有自己的事情要做，但是他们还是可以选择哪些课去上的）。私人日历主要是个人本地的安排，都是和团队可能不相关的日程，可以是工作事项也可以是生活事项。工作日历就是涉及团队项目了，日程可以assign给别人，别人也会收到提醒，也会"链接"到做事课空间的做事课啥的。全景就是同时包含私人和工作。这几个日历都可以设置为公开，被别的同学看见，也可以作为帖子快捷发布.同学们可以互相交流日程
3.agent交互。这个是之前没有和你讲的。我应该后续还要有一个agent页面，llm为deepseek的模型，工具箱要为这个网页量身定制（网上要是有优秀的开源的就可以直接用）。对于日历的agent交互，我想到的是"我要在xx时做xx" "我准备在xx时干xx，通知xx和xx……" "每xx时我都要xx，提醒我"
还有什么你觉得好的有用的工具随时提，主要看还有哪些高频和舒服的需求可以被agent调用工具解决，这也是很不错的
本来可以在专门的agent页通过自然语言和agent提需求，但是现在在日历页也有一个入口可以用自然语言创建日程（调用相关工具），是一个对话框，

这些功能也可以抄进去
Openings|老师/同学对外开放可预约时段|
Proposals|活动发起人给多个候选时间，大家投票/确认|
附件|活动卡里挂海报、脚本、排练视频、材料清单|
会议链接识别|自动把腾讯会议、飞书、Zoom、Meet 变成"一键进入"按钮|
双击空白处快速新建|不要让用户先点一堆按钮|
拖拽移动、拉伸改时长|日历是空间界面，不是表单界面|
事件关联页面|每个活动不是孤立卡片，而是能点进"活动详情页"|
|Deadline Risk|截止日快到了但还没安排时间，自动标红|
|任务停车场|左侧一栏放"未安排任务"，拖到日历里变时间块|
|Shutdown Ritual|晚上自动总结：今天完成了什么，哪些滚到明天|
|自动滚动未完成任务|今天没完成的任务不要消失，自动进入明日待安排|

 拖拽和拉伸必须好用
日历是空间界面，用户天然会想：
|操作|含义|
|---|---|
|拖动事件|改时间|
|拉长卡片|改时长|
|拖到另一天|改日期|
|点击空白处|新建事件|
|双击事件|编辑|
|悬停事件|快速预览|
|右键事件|更多操作|
如果你做了日历但不能拖拽，它会像死的。
拖拽时特别要注意：
1. 要有吸附，比如每 15 分钟一格
2. 拖动时要显示新时间
3. 拖动到冲突位置时要提示
4. 松手前不要立刻保存，最好有撤销
5. 移动重复事件时，要问"只改这一次还是整个系列"

"社区脉搏"视觉层
可以在日历上加一层很轻的情绪/节奏感。
比如每一天不是只有事件数量，还可以有：
|指标|表现|
|---|---|
|活动密度|日期格背景轻微加深|
|展演/开放日|日期上有特殊徽章|
|截止日|细线/小旗标|
|社区高峰|顶部小波形|
|空闲日|留白更多，视觉更安静|
这样月视图会像一张社区生命体的节奏图。
但一定要克制，不能变成数据大屏。

"空间视角"的日历
这个非常适合学校/社区。
比如把黑匣子、教室、展厅、会议室作为横轴，时间作为纵轴：
|时间|黑匣子|教室 A|展区|会议室|
|---|---|---|---|---|
|10:00|空|课程|空|会议|
|14:00|排练|空|布展|空|
这个视图会非常实用，尤其是期末展、排练、开放日这种场景。
你甚至可以做成：
 空间占用地图
点击某个空间，显示今天的占用状态。

"活动从草稿到发生"的状态流
普通日历只有"事件"。  
但你的社区活动可能有生命周期：
|状态|含义|
|---|---|
|想法|还只是一个活动想法|
|草稿|时间地点未完全确认|
|待确认|等负责人/场地/参与者确认|
|已确认|可以公开|
|报名中|允许加入|
|进行中|当前正在发生|
|已结束|可以归档、上传材料|
|已复盘|有总结和作品沉淀|
这个很特别。
你可以让事件卡片有状态：
> 草稿事件是虚线边框  
> 待确认是半透明  
> 已确认是实色  
> 进行中有轻微呼吸动效  
> 已结束变灰但可点进复盘
这会比普通日历高级很多。

"时间块"和"真实事件"要分开（半透明）
这点非常重要。
用户日历里有两种东西：
|类型|含义|
|---|---|
|真实事件|必须参加，已经承诺，例如课程、会议、排练|
|计划时间块|我打算做，例如写稿、做项目、剪视频|
它们不能长得一样。
建议：
|类型|视觉|
|---|---|
|真实事件|实色卡片|
|计划时间块|半透明卡片|
|截止日|小旗标，不占整块时间|
|提醒|小点或浮标|
|任务|可拖拽小卡片|
这样用户不会把"我想做"误认为"我必须去"。】

---

## 7. 拆好的切片 + 建造顺序（建议）

切片 1（已上线）= 地基 + 拖拽。后续：

- **切片 1.5 重复事件** ← 先做这个：每周/每天循环 + "只改这次 vs 整个系列"（FullCalendar rrule 插件 + 例外覆盖模型）。课表的每周重复已用内置 daysOfWeek，不算。
- **任务流**：任务停车场（左栏未安排任务拖进日历变时间块）、Deadline Risk 标红、未完成自动滚明天、Shutdown Ritual 晚间总结、task↔event 联动、链到做事课空间。
- **协作**：日历公开/分享、作为帖子快捷发布、工作日历指派给别人 + 提醒、Openings（可约时段）、Proposals（候选时间投票）。`Event` 到这切片再加 `assignee_id` 等列。
- **富事件**：附件（海报/脚本/视频/材料清单）、会议链接识别（腾讯/飞书/Zoom/Meet → 一键进入）、活动详情页、完整生命周期状态流（想法→草稿→待确认→已确认→报名中→进行中→已结束→已复盘 + 对应虚线/半透明/呼吸/置灰视觉）。
- **视觉层（克制）**：社区脉搏（活动密度底色/徽章/截止旗/波形/空闲留白）、空间视图（场地×时间占用图）。
- **Agent 子系统（独立 epic）**：DeepSeek + 为本站定制工具箱；日历页的自然语言建日程对话框接它（"我要在 xx 做 xx""每 xx 提醒我"）。先做轻量解析顶着也行。

每个切片：**brainstorm（脑暴对齐范围）→ spec（写 `docs/specs/`）→ plan（写 `docs/plans/`）→ 实现 → build/test/真库 smoke → 部署 → 用户验**。

---

## 8. 工作纪律

- 小步提交、频繁验证（`npm run build` / `npm test` / 真库 smoke 脚本）。改完 web 必部署 Pages，给**绝对线上链接（单独一行）**。
- 不擅自扩范围；本文件/spec 没说清的，先问一个小问题或取最保守可逆实现。
- **不推翻已锁决策**：FullCalendar / 客户端 Supabase / 静态 Pages / agent 延后 / 课表只读。
- 用户偏好：每次回答开头列**任务待办清单**（勾叉 + AI/人肉/混合 标注，只增不减）；自主决策小事、只在影响产品形态或真缺信息时才问。
- 安全：service_role / DB 密码只在 `.env.local`，绝不进仓库或文档。RLS 负样本要进验证。
