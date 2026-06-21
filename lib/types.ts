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
