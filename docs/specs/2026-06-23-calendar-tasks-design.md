# 好奇 Online · 日历切片 1.9 设计（任务 + 任务停车场）

> 承接 1.5-1.8。架构不变（静态导出 + 客户端 Supabase + RLS）。自主实施。
> 实现负责人愿景里的「任务停车场 / task↔event 联动 / Deadline Risk」。

## 决策（自定）
- 「任务」= **新建轻量 `Task` 表（个人待办）**，与未来做事空间的 `ProjectTask`（项目内任务）**分开**——日历的停车场是"我的私人待办"，不是项目看板。日后可加 `Task.project_id` 软关联，不在本切片。
- 拖拽难无人验证 → **主交互 = 点「安排」**：未安排任务点一下 → 预填创建表单（kind=时间块、标题=任务名）→ 存 → 回写 `Task.scheduled_event_id`。FC 外部拖拽作为**增强**（能做就加，验证以点击为准）。

## IN
1. `Task` 表：`id / owner_id / title / notes / due_at(可空) / status(todo|done) / scheduled_event_id(→Event,可空) / 时间戳 / deleted_at`。RLS：**仅本人** CRUD。
2. **任务停车场**（日历页可折叠面板）：列「未安排」任务（status=todo 且 scheduled_event_id 为空），含快速新建输入框、完成勾选、删除。
3. **安排到日历**：任务点「安排」→ 预填创建表单（时间块）→ 保存后 `createEvent` 拿到 id → `updateTask(scheduled_event_id)`。安排后从停车场移除（已排期）。
4. **Deadline Risk 标红**：`due_at` 在未来 48h 内且未安排的任务 → 红色徽标 + 排到列表前。
5. 能力 API（`lib/data.ts`）：`getTasks/createTask/updateTask/scheduleTask/softDeleteTask`，UI 与未来 Agent 共用。

## OUT（后续）
- 未完成自动滚明天、Shutdown Ritual 晚间总结（需 cron/登录时跑，留后）。
- 拖任务进日历（FC Draggable）若本切片来不及则留下一刀。
- 与做事空间 ProjectTask 的关联。
- 提醒通知（无通道）。

## 验收
- 停车场建任务、勾完成、删除；点「安排」预填表单存为时间块并回写 link；安排后停车场移除；due 48h 内标红；RLS 跨用户读不到他人任务（smoke）；build/test 过；部署。
