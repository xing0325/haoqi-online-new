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
export type CalEvent = {
  id: string;
  calendarId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  kind: "event" | "timeblock";
  status: "draft" | "confirmed" | "done" | "cancelled";
  location: string | null;
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
