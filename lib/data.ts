// 取数层（真 Supabase 实现）。登录后用 anon 客户端按 RLS 查询。
// 课程/课表/动态/帖子/评论 = 真数据；大家正在/积分/阅读 = 诚实占位（对应模块尚未建）。
import { supabase } from "./supabase/browser";
import type {
  AvatarColor,
  CalEvent,
  Calendar,
  CommentItem,
  Course,
  CourseListItem,
  FeedPost,
  PostDetail,
  PostListItem,
  PulseItem,
  ReadingSummary,
  ScheduleEntry,
  ScheduleRecurring,
  ScoreSummary,
  UserLite,
  WeekSlot,
} from "./types";

export const IS_MOCK = false;

// ---- 派生工具 ----
const COURSE_COLORS: AvatarColor[] = ["yellow", "coral", "blue", "mint", "pink"];
const USER_COLORS: AvatarColor[] = ["pink", "yellow", "blue", "mint"];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const courseColor = (id: string) => COURSE_COLORS[hash(id) % COURSE_COLORS.length];
const userColor = (id: string) => USER_COLORS[hash(id) % USER_COLORS.length];

function rel(iso: string | null): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return d === 1 ? "昨天" : `${d} 天前`;
}
const firstLine = (md: string | null) => (md ? md.split("\n")[0] : "");
function slotKindTitle(kind: string): string {
  return kind === "large_elective" ? "大选修" : kind === "small_elective" ? "小选修" : kind === "free" ? "自由发生" : "课程";
}
function slotState(start: string, end: string, kind: string): ScheduleEntry["state"] {
  if (kind === "free") return "free";
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const toM = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const a = toM(start);
  const b = toM(end);
  if (cur >= a && cur < b) return "now";
  if (cur >= b) return "done";
  return "upcoming";
}

function toCourse(c: any): Course {
  const label: string = c.short_name ?? c.name;
  return {
    id: c.id,
    name: c.name,
    shortName: c.short_name ?? c.name.charAt(0),
    initial: label.charAt(0),
    avatarColor: courseColor(c.id),
    description: c.description ?? undefined,
  };
}
function toUser(p: any): UserLite {
  return { id: p.id, displayName: p.display_name, initial: p.display_name.charAt(0), avatarColor: userColor(p.id) };
}
function commentCount(row: any): number {
  return row?.Comment?.[0]?.count ?? 0;
}

async function courseMapByIds(ids: string[]): Promise<Record<string, Course>> {
  if (ids.length === 0) return {};
  const { data } = await supabase().from("Course").select("id, name, short_name, description").in("id", ids);
  const m: Record<string, Course> = {};
  for (const c of data ?? []) m[c.id] = toCourse(c);
  return m;
}

// ---- 真数据 ----

export async function getCourses(): Promise<Course[]> {
  const { data } = await supabase().from("Course").select("id, name, short_name, description").order("created_at");
  return (data ?? []).map(toCourse);
}

export async function getCourseList(): Promise<CourseListItem[]> {
  const courses = await getCourses();
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: recent } = await supabase()
    .from("Post")
    .select("space_id")
    .eq("status", "published")
    .eq("space_type", "course")
    .is("deleted_at", null)
    .gte("published_at", since);
  const counts: Record<string, number> = {};
  for (const r of (recent ?? []) as any[]) counts[r.space_id] = (counts[r.space_id] ?? 0) + 1;
  return courses.map((c) => ({ ...c, hasUpdate: (counts[c.id] ?? 0) > 0, newCount: counts[c.id] ?? 0 }));
}

export async function getCourse(id: string): Promise<Course | null> {
  const { data } = await supabase().from("Course").select("id, name, short_name, description").eq("id", id).maybeSingle();
  return data ? toCourse(data) : null;
}

export async function getTodaySchedule(): Promise<ScheduleEntry[]> {
  const { data: term } = await supabase().from("Term").select("id").eq("is_active", true).maybeSingle();
  if (!term) return [];
  const weekday = ((new Date().getDay() + 6) % 7) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const { data: slots } = await supabase()
    .from("ScheduleSlot")
    .select("id, starts_at, ends_at, slot_kind, course_id")
    .eq("term_id", (term as any).id)
    .eq("weekday", weekday)
    .order("starts_at");
  if (!slots || slots.length === 0) return [];
  const courseMap = await courseMapByIds([...new Set((slots as any[]).map((s) => s.course_id).filter(Boolean))]);
  const slotIds = (slots as any[]).map((s) => s.id);
  const { data: changes } = await supabase()
    .from("ScheduleChange")
    .select("id, slot_id, change_type, message, new_location")
    .in("slot_id", slotIds)
    .eq("occurs_on", today)
    .is("deleted_at", null);
  const changeBySlot: Record<string, any> = {};
  for (const ch of (changes ?? []) as any[]) changeBySlot[ch.slot_id] = ch;

  return (slots as any[]).map((s) => {
    const course = s.course_id ? courseMap[s.course_id] : undefined;
    const ch = changeBySlot[s.id];
    return {
      slotId: s.id,
      startsAt: String(s.starts_at).slice(0, 5),
      endsAt: String(s.ends_at).slice(0, 5),
      slotKind: s.slot_kind,
      course,
      title: course ? course.name : slotKindTitle(s.slot_kind),
      subtitle: ch?.new_location ?? undefined,
      change: ch
        ? { id: ch.id, changeType: ch.change_type, message: ch.message, newLocation: ch.new_location ?? undefined }
        : undefined,
      state: slotState(String(s.starts_at), String(s.ends_at), s.slot_kind),
    };
  });
}

export async function getWeekSchedule(): Promise<{ slots: WeekSlot[]; weekdayToday: number }> {
  const weekdayToday = ((new Date().getDay() + 6) % 7) + 1;
  const { data: term } = await supabase().from("Term").select("id").eq("is_active", true).maybeSingle();
  if (!term) return { slots: [], weekdayToday };
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows } = await supabase()
    .from("ScheduleSlot")
    .select("id, weekday, starts_at, ends_at, slot_kind, course_id")
    .eq("term_id", (term as { id: string }).id)
    .order("weekday")
    .order("starts_at");
  if (!rows || rows.length === 0) return { slots: [], weekdayToday };
  const courseMap = await courseMapByIds([...new Set((rows as any[]).map((r) => r.course_id).filter(Boolean))]);
  const { data: changes } = await supabase()
    .from("ScheduleChange")
    .select("slot_id, change_type, new_location")
    .eq("occurs_on", today)
    .is("deleted_at", null)
    .in("slot_id", (rows as any[]).map((r) => r.id));
  const changeBySlot: Record<string, any> = {};
  for (const ch of (changes ?? []) as any[]) changeBySlot[ch.slot_id] = ch;

  const slots: WeekSlot[] = (rows as any[]).map((r) => {
    const course = r.course_id ? courseMap[r.course_id] : undefined;
    const ch = changeBySlot[r.id];
    return {
      slotId: r.id,
      weekday: r.weekday,
      startsAt: String(r.starts_at).slice(0, 5),
      endsAt: String(r.ends_at).slice(0, 5),
      title: course ? course.name : slotKindTitle(r.slot_kind),
      slotKind: r.slot_kind,
      courseId: r.course_id ?? null,
      avatarColor: course ? course.avatarColor : null,
      hasChangeToday: !!ch,
      changeNote: ch
        ? ch.change_type === "cancelled"
          ? "已取消"
          : ch.new_location
            ? `→ ${ch.new_location}`
            : "有变化"
        : null,
    };
  });
  return { slots, weekdayToday };
}

export async function getCourseFeed(): Promise<FeedPost[]> {
  const { data: posts } = await supabase()
    .from("Post")
    .select("id, space_id, title, body_markdown, published_at, Comment(count)")
    .eq("status", "published")
    .eq("space_type", "course")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(8);
  if (!posts) return [];
  const courseMap = await courseMapByIds([...new Set((posts as any[]).map((p) => p.space_id))]);
  return (posts as any[]).map((p) => ({
    id: p.id,
    course: courseMap[p.space_id],
    title: p.title,
    excerpt: firstLine(p.body_markdown),
    publishedAtLabel: rel(p.published_at),
    commentCount: commentCount(p),
    watching: undefined,
    kind: "text" as const,
  })).filter((p) => p.course);
}

export async function getCoursePosts(courseId: string): Promise<PostListItem[]> {
  const { data: posts } = await supabase()
    .from("Post")
    .select("id, title, body_markdown, published_at, Comment(count)")
    .eq("space_id", courseId)
    .eq("status", "published")
    .eq("space_type", "course")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });
  return (posts ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    excerpt: firstLine(p.body_markdown),
    publishedAtLabel: rel(p.published_at),
    commentCount: commentCount(p),
    kind: "text" as const,
  }));
}

export async function getPost(postId: string): Promise<PostDetail | null> {
  const { data: p } = await supabase()
    .from("Post")
    .select("id, space_id, title, body_markdown, published_at, author:profiles(id, display_name)")
    .eq("id", postId)
    .maybeSingle();
  if (!p) return null;
  const course = await getCourse((p as any).space_id);
  if (!course) return null;
  return {
    id: (p as any).id,
    course,
    author: toUser((p as any).author),
    title: (p as any).title,
    bodyMarkdown: (p as any).body_markdown ?? "",
    images: [],
    publishedAtLabel: rel((p as any).published_at),
  };
}

export async function getComments(postId: string): Promise<CommentItem[]> {
  const { data } = await supabase()
    .from("Comment")
    .select("id, body, created_at, author:profiles(id, display_name)")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at");
  return (data ?? []).map((c: any) => ({
    id: c.id,
    author: toUser(c.author),
    body: c.body,
    timeLabel: rel(c.created_at),
  }));
}

// 当前用户在某课的成员角色（用于判断能否发帖）。
export async function getCourseRole(courseId: string, userId: string): Promise<string | null> {
  const { data } = await supabase()
    .from("CourseMembership")
    .select("role")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

// 发帖（RLS 兜权限：author_id=auth.uid() 且 can_post_course）。
export async function createPost(
  courseId: string,
  userId: string,
  title: string,
  body: string,
  publish: boolean,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase()
    .from("Post")
    .insert({
      space_type: "course",
      space_id: courseId,
      title,
      body_markdown: body,
      author_id: userId,
      status: publish ? "published" : "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "42501" ? "你没有在这门课发帖的权限。" : "发布失败，再试一次。" };
  return { id: (data as { id: string }).id };
}

// ---- 日历：Calendar / Event / 课表转重复事件 ----

const CAL_COLOR = { personal: "#5b9be0", work: "#ef785e" };
const COURSE_HEX: Record<string, string> = {
  yellow: "#e6c000",
  coral: "#ef785e",
  blue: "#5b9be0",
  mint: "#4cb88a",
  pink: "#ef8aa0",
};

function toCalEvent(e: any): CalEvent {
  return {
    id: e.id,
    calendarId: e.calendar_id,
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    allDay: e.all_day,
    kind: e.kind,
    status: e.status,
    location: e.location ?? null,
  };
}

export async function getCalendars(): Promise<Calendar[]> {
  const { data } = await supabase()
    .from("Calendar")
    .select("id, name, kind, color, visibility")
    .order("created_at");
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    visibility: c.visibility,
  }));
}

export async function getMyCalendars(userId: string): Promise<Calendar[]> {
  const { data } = await supabase()
    .from("Calendar")
    .select("id, name, kind, color, visibility")
    .eq("owner_id", userId)
    .order("created_at");
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    visibility: c.visibility,
  }));
}

// 首次进日历页：本人没有「私人」/「工作」日历就各建一本。
export async function ensureDefaultCalendars(userId: string): Promise<void> {
  const { data } = await supabase().from("Calendar").select("kind").eq("owner_id", userId);
  const kinds = new Set((data ?? []).map((c: any) => c.kind));
  const toCreate: any[] = [];
  if (!kinds.has("personal"))
    toCreate.push({ owner_id: userId, name: "私人", kind: "personal", color: CAL_COLOR.personal });
  if (!kinds.has("work"))
    toCreate.push({ owner_id: userId, name: "工作", kind: "work", color: CAL_COLOR.work });
  if (toCreate.length) await supabase().from("Calendar").insert(toCreate);
}

// 与 [fromISO, toISO] 时间窗有交集的事件（event.starts_at < to 且 event.ends_at > from）。
export async function getEventsInRange(
  calendarIds: string[],
  fromISO: string,
  toISO: string,
): Promise<CalEvent[]> {
  if (calendarIds.length === 0) return [];
  const { data } = await supabase()
    .from("Event")
    .select("id, calendar_id, title, starts_at, ends_at, all_day, kind, status, location")
    .in("calendar_id", calendarIds)
    .is("deleted_at", null)
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
    .order("starts_at");
  return (data ?? []).map(toCalEvent);
}

export async function createEvent(
  input: {
    calendarId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    allDay?: boolean;
    kind?: "event" | "timeblock";
    location?: string | null;
  },
  userId: string,
): Promise<CalEvent | { error: string }> {
  const { data, error } = await supabase()
    .from("Event")
    .insert({
      calendar_id: input.calendarId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      all_day: input.allDay ?? false,
      kind: input.kind ?? "event",
      location: input.location ?? null,
      created_by: userId,
    })
    .select("id, calendar_id, title, starts_at, ends_at, all_day, kind, status, location")
    .single();
  if (error) return { error: error.code === "42501" ? "没权限往这个日历写。" : "新建失败，再试一次。" };
  return toCalEvent(data);
}

export async function updateEventTime(
  id: string,
  startsAt: string,
  endsAt: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase().from("Event").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", id);
  return error ? { error: "保存失败" } : { ok: true };
}

export async function updateEvent(
  id: string,
  patch: {
    title?: string;
    startsAt?: string;
    endsAt?: string;
    kind?: "event" | "timeblock";
    status?: "draft" | "confirmed" | "done" | "cancelled";
    location?: string | null;
  },
): Promise<{ ok: true } | { error: string }> {
  const row: any = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.startsAt !== undefined) row.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) row.ends_at = patch.endsAt;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.location !== undefined) row.location = patch.location;
  const { error } = await supabase().from("Event").update(row).eq("id", id);
  return error ? { error: "保存失败" } : { ok: true };
}

export async function softDeleteEvent(id: string): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase().from("Event").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  return error ? { error: "删除失败" } : { ok: true };
}

// 课表（只读层）→ FullCalendar 重复事件输入。
export async function getScheduleAsRecurring(): Promise<ScheduleRecurring[]> {
  const { data: term } = await supabase().from("Term").select("id").eq("is_active", true).maybeSingle();
  if (!term) return [];
  const { data: rows } = await supabase()
    .from("ScheduleSlot")
    .select("weekday, starts_at, ends_at, slot_kind, course_id")
    .eq("term_id", (term as { id: string }).id);
  const courseMap = await courseMapByIds([
    ...new Set((rows ?? []).map((r: any) => r.course_id).filter(Boolean)),
  ]);
  return (rows ?? []).map((r: any) => {
    const course = r.course_id ? courseMap[r.course_id] : undefined;
    return {
      title: course ? course.name : slotKindTitle(r.slot_kind),
      daysOfWeek: [r.weekday === 7 ? 0 : r.weekday],
      startTime: String(r.starts_at).slice(0, 5),
      endTime: String(r.ends_at).slice(0, 5),
      color: course ? COURSE_HEX[course.avatarColor] : "#aeb6c2",
      courseId: r.course_id ?? null,
    };
  });
}

// ---- 诚实占位（对应模块尚未建：大家在干嘛 / 信用积分 / 阅读联赛）----

export async function getPulse(): Promise<PulseItem[]> {
  return [];
}

export async function getMyScore(): Promise<ScoreSummary> {
  return { score: 0, max: 100, note: "信用积分模块还没接，这里先空着。" };
}

export async function getReadingSummary(): Promise<ReadingSummary> {
  return { thisWeek: "—", bookTitle: "阅读联赛待接入", bookAuthor: "", progress: 0 };
}
