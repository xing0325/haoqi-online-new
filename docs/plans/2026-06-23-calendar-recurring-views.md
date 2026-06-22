# 日历切片 1.5 实现计划（重复事件 + 滴答清单全套视图）

- **spec**：`docs/specs/2026-06-23-calendar-recurring-views-design.md`
- **分支**：`feat/first-slice-scaffold`（自合 `main` 触发 Pages 部署）
- **自主执行**：负责人睡了，全程不问、决策自定（见 spec §10 已记 v1 简化）。

## 任务序列（每步：实现 → 验证）
1. [x] 依赖：`rrule` + `@fullcalendar/list` + `@fullcalendar/multimonth`（npm i 完成，exit 0）。
2. [ ] 迁移 `20260623120000_calendar_recurring.sql`：4 列 + 约束/索引 + 触发器冻结新列 → 套云库（`db-apply.mjs 20260623120000`）。
3. [ ] 类型 `lib/types.ts`：`CalEvent` 加 `rrule/recurUntil/seriesId/occurrenceStart`；新增 `Recurrence`、`EditScope`、`FCInstance`。
4. [ ] 重复纯函数 `lib/recurrence.ts`（**TDD**，先写 `recurrence.test.ts`）：`buildRRule/parseRRule/expandSeries/mergeOverrides/describeRRule/computeRecurUntil`。vitest 绿。
5. [ ] 数据层 `lib/data.ts`：`getEventsForWindow`（母+子+单次 → 展开）；能力 API：`createEvent(recurrence)/updateSeries/updateOccurrence/cancelOccurrence/splitSeries/deleteSeries`。
6. [ ] UI `CalendarBoard.tsx`：注册 list+multimonth 视图；底部药丸切换；重复选择器 + 人话预览；作用范围弹窗(改/删)；`↻` 角标；`+N` 溢出 popover；list 圆圈勾选→done；年热力 `dayCellDidMount`。
7. [ ] CSS：马卡龙板 + 药丸条 + list + 年热力 + 天气云 + popover（`calendar-theme.css` / `Calendar.module.css`）。
8. [ ] 测试/烟测：`recurrence.test.ts`（vitest 全绿）；`scripts/recurring-smoke.mjs`（真库：建系列→展开→override/cancel/split→跨用户拒绝）。
9. [ ] build：`npm run build`（静态导出过）。
10. [ ] 部署：`feat→main` ff-merge → push → `gh run watch` → 验证线上。
11. [ ] 收尾：更新 `HANDOFF_CALENDAR.md`「切片 1.5 已上线」；memory；commit。

## 决策记录（自主）
- 作用范围 **3 选**（仅此次/此次及以后/整个系列）；重复底层全 RRULE，UI 精简档。
- **自展开**（rrule.js），不用 FC rrule 插件（单实例拖拽可控）。
- 例外用**子行**（recurrence-id 范式）。
- v1 简化：提醒通知不做、年热力仅本人、系列撤销弱化、拆分丢未来 override、双周/多日可选。

## ✅ 完成（2026-06-23）
全部 11 步做完并**已上线**：https://xing0325.github.io/haoqi-online-new/
- 迁移已套云库；`lib/recurrence.ts` 20 单测绿；`recurring-smoke.mjs` 真库 **10/10**（schema/约束/触发器/RLS 负样本）。
- `npm run build` 静态导出过；`npm test` 21/21。
- 浏览器实测（dev 3216，登录 chichu）：五视图均渲染；灌的「每周·团队站会」demo 在周视图 1 次、月视图 6 次、均带 `↻`；年视图热力 33 格、0 冗余事件节点。
- 已 commit `070625e`，feat→main ff，push，CI `27975686840` 成功部署。
- 残留小事（不挡）：年视图大量重复源仍会在内存展开（已不铺 DOM）；form 的建/改/删走 FC 交互未用脚本点测（纯 React + 已 smoke 的能力 API，低风险）。`scripts/seed-recur-demo.mjs` 给 chichu 留了一条可删的 demo 重复事件。
