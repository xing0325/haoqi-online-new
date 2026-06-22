// 领域类型（UI 用，对齐 spec §3 的数据库结构；mock 与未来 Supabase 客户端都返回这些形状）。

export type Role = "student" | "teacher" | "admin";
export type SlotKind = "required" | "large_elective" | "small_elective" | "free";
export type ChangeType = "location" | "time" | "cancelled" | "note";
export type AvatarColor = "pink" | "yellow" | "blue" | "mint" | "coral";

export type UserLite = {
  id: string;
  displayName: string;
  initial: string; // 头像无图时显示的首字
  avatarColor: AvatarColor;
};

export type Course = {
  id: string;
  name: string;
  shortName: string;
  initial: string;
  avatarColor: AvatarColor;
  description?: string;
};

export type ScheduleChange = {
  id: string;
  changeType: ChangeType;
  message: string;
  newLocation?: string;
};

/** 今天的一节课（官方 ScheduleSlot 叠加当天 ScheduleChange 后的渲染形状）。 */
export type ScheduleEntry = {
  slotId: string;
  startsAt: string; // "09:00"
  endsAt: string; // "10:30"
  slotKind: SlotKind;
  course?: Course;
  title: string;
  subtitle?: string;
  change?: ScheduleChange; // 有则课表卡标红 + 进调课横幅
  state: "now" | "upcoming" | "done" | "free";
};

/** 综合动态流里的一条已发布 Post（带课程信息）。 */
export type FeedPost = {
  id: string;
  course: Course;
  title: string;
  excerpt?: string;
  publishedAtLabel: string; // "20 分钟前"
  commentCount: number;
  watching?: number;
  kind: "text" | "photo";
};

/** 「大家正在」的一条状态（首页只读派生，mock 阶段为示例）。 */
export type PulseItem = {
  id: string;
  user: UserLite;
  verb: string; // "在写" / "正在" / "想找人"
  what: string;
  timeLabel: string;
};

export type ScoreSummary = { score: number; max: number; note: string };
export type ReadingSummary = { thisWeek: string; bookTitle: string; bookAuthor: string; progress: number };

/** 课程列表里的一门课（含「有新动态」派生标记，spec §2.2.1：48h 内有新已发布帖即亮）。 */
export type CourseListItem = Course & { hasUpdate: boolean; newCount: number };

/** 课程主页瀑布流里的一条帖子卡片。 */
export type PostListItem = {
  id: string;
  title: string;
  excerpt?: string;
  publishedAtLabel: string;
  commentCount: number;
  kind: "text" | "photo";
};

/** 动态详情页（小红书笔记式）。images：mock 阶段为占位色，真实为 Storage 签名 URL。 */
export type PostDetail = {
  id: string;
  course: Course;
  author: UserLite;
  title: string;
  bodyMarkdown: string;
  images: string[];
  publishedAtLabel: string;
};

export type CommentItem = {
  id: string;
  author: UserLite;
  body: string;
  timeLabel: string;
};

/** 官方周课表里的一个时段（只读公共事实）。 */
export type WeekSlot = {
  slotId: string;
  weekday: number; // 1=周一 .. 7=周日
  startsAt: string;
  endsAt: string;
  title: string;
  slotKind: SlotKind;
  courseId: string | null;
  avatarColor: AvatarColor | null;
  hasChangeToday: boolean;
  changeNote: string | null;
};

export type CalKind = "personal" | "work";
export type Calendar = {
  id: string;
  name: string;
  kind: CalKind;
  color: string | null;
  visibility: "private" | "public";
};
export type EventKind = "event" | "timeblock";
export type EventStatus = "draft" | "confirmed" | "done" | "cancelled";

export type CalEvent = {
  id: string;
  calendarId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  kind: EventKind;
  status: EventStatus;
  location: string | null;
  // 重复（切片 1.5）：
  // 母事件 = rrule 非空 + seriesId null；override/exception 子行 = seriesId+occurrenceStart 非空；普通单次 = 三者皆 null。
  rrule: string | null; // 母事件的 RFC5545 RRULE（不含 DTSTART）
  recurUntil: string | null; // 母事件末次出现起始（范围查询剪枝用）
  seriesId: string | null; // 子行 → 母事件 id
  occurrenceStart: string | null; // 子行覆盖的"那次"的原始起始（recurrence-id）
};

/** 改/删重复事件的作用范围。 */
export type EditScope = "this" | "thisAndFuture" | "all";

export type RecurFreq = "daily" | "weekly" | "monthly" | "yearly";

/** 人类精简档构造重复的结构（UI 用）；`lib/recurrence.ts` 转成 RRULE 串存库。 */
export type Recurrence = {
  freq: RecurFreq;
  interval: number; // 每 N（UI 默认 1、不露；Agent 可设）
  byWeekday: number[]; // 仅 weekly 用；0=周一 .. 6=周日（与 rrule.js .weekday 一致）
  endMode: "never" | "until" | "count";
  until: string | null; // endMode='until' 的截止日（ISO date）
  count: number | null; // endMode='count' 的次数
};

/** 展开后喂给 FullCalendar 的一个实例（单次或某一次重复）。 */
export type CalInstance = {
  instanceId: string; // 单次=row.id；重复=`${masterId}::${occISO}`
  masterId: string | null; // 重复实例的母 id；单次为 null
  occurrenceStart: string | null; // 重复实例的原始 occ 起始（ISO）；单次为 null
  overrideId: string | null; // 该 occ 被某 override 子行覆盖时，子行 id
  calendarId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  kind: EventKind;
  status: EventStatus;
  location: string | null;
  isRecurring: boolean;
  seriesRrule: string | null; // 母事件的 RRULE（给编辑器回填精简档）；单次/无母为 null
};
/** 课表 slot 转成 FullCalendar 重复事件输入。 */
export type ScheduleRecurring = {
  title: string;
  daysOfWeek: number[]; // FullCalendar：0=周日..6=周六
  startTime: string;
  endTime: string;
  color: string;
  courseId: string | null;
};
