# 好奇 Online · 日历切片 1.6 设计+计划（富事件 lite）

> 承接切片 1.5。架构不变（静态导出 + 客户端 Supabase + RLS）。负责人睡了，自主实施、决策自定。
> 取自负责人愿景「抄进去」清单里架构干净、可完整验证的三项：会议链接识别 / 悬停快速预览 / 活动详情页。

## IN（本切片）
1. **会议链接识别**：`lib/meeting.ts` 纯函数 `detectMeetingLink(text) → { provider, url } | null`，识别腾讯会议 / 飞书 / Zoom / Google Meet / 钉钉 / 通用 https。事件的 `location` 或 `title` 命中 → 在编辑表单、悬停卡、详情页给「进入会议」按钮（`target=_blank rel=noopener`）。
2. **悬停快速预览**：FullCalendar `eventMouseEnter` → 轻卡片（标题 · 时间 · 地点 · [进入会议]），`eventMouseLeave` 消失。课程事件也显示（标题 + 时间）。
3. **活动详情页 `/event?id=`**（客户端读参，静态友好，沿用 `/course?id=` 范式）：标题 / 时间 / 重复描述（describeRRule）/ 地点 / 归属日历 / 进入会议。附件、关联做事课 = **「建设中」诚实占位**。编辑表单加「详情 ↗」。重复实例传 `?id=<master>&occ=<iso>`，页面标注「这是 X 的某一次（日期）」。

## OUT（后续切片）
- 附件真上传（Storage）、关联做事课真链接、完整生命周期状态流、报名 / Openings / Proposals。

## 技术
- `lib/meeting.ts`：扫描文本里的 URL，按 host 归类 provider；纯函数、单测。
- `CalendarBoard.tsx`：`eventMouseEnter/Leave` 控制一个绝对定位悬浮卡（React state + 鼠标坐标）；表单里若 `detectMeetingLink(location||title)` 命中显示按钮。
- `app/event/page.tsx`（client）：`useAuth` + `getEvent(id)`；`?occ=` 有则覆盖显示时间并标注「某一次」。
- 不动数据库（无迁移）。

## 验收
- `lib/meeting.test.ts` 覆盖腾讯/飞书/Zoom/Meet/钉钉/通用/无链接；vitest 绿。
- 悬停事件出卡片，含「进入会议」（当 location 是会议链接）。
- `/event?id=` 渲染详情 + 进入会议；占位标「建设中」。
- `npm run build` + `npm test` 过；部署 Pages；线上可开。
