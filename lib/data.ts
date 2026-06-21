// 取数层（首切片 mock 实现）。所有函数返回 Promise，签名即未来 Supabase 客户端版本的契约；
// 拿到 Supabase key 后只替换这些函数体（改成 createClient().from(...).select(...)），UI 不动。
//
// 诚实标注：当前为示例数据，非真实业务状态。示例姓名/积分/日期不可当真。

import type {
  CommentItem,
  Course,
  CourseListItem,
  FeedPost,
  PostDetail,
  PostListItem,
  PulseItem,
  ReadingSummary,
  ScheduleEntry,
  ScoreSummary,
  UserLite,
} from "./types";

export const IS_MOCK = true;

const u = (id: string, displayName: string, initial: string, avatarColor: UserLite["avatarColor"]): UserLite => ({
  id,
  displayName,
  initial,
  avatarColor,
});

const USERS = {
  david: u("u-david", "David", "D", "pink"),
  siqi: u("u-siqi", "思齐", "思", "yellow"),
  linyuan: u("u-linyuan", "林元", "林", "blue"),
  yueyue: u("u-yueyue", "岳岳", "岳", "mint"),
};

const COURSES: Course[] = [
  { id: "c-method", name: "问题与方法", shortName: "问", initial: "问", avatarColor: "yellow", description: "把好奇心拆成可操作的问题。" },
  { id: "c-walk", name: "城市漫游", shortName: "城", initial: "城", avatarColor: "coral", description: "把城市当成一本可以走进去的书。" },
  { id: "c-read", name: "阅读实验室", shortName: "读", initial: "读", avatarColor: "blue", description: "一起读，一起把句子划线。" },
  { id: "c-make", name: "做事课", shortName: "做", initial: "做", avatarColor: "mint", description: "把想法推进成真的东西。" },
];

const byId = (id: string) => COURSES.find((c) => c.id === id)!;

export async function getCourses(): Promise<Course[]> {
  return COURSES;
}

export async function getTodaySchedule(): Promise<ScheduleEntry[]> {
  return [
    {
      slotId: "s-1",
      startsAt: "09:00",
      endsAt: "10:30",
      slotKind: "required",
      course: byId("c-method"),
      title: "问题与方法",
      subtitle: "和 Kiki 在 301 · 还有 18 分钟",
      state: "now",
    },
    {
      slotId: "s-2",
      startsAt: "11:00",
      endsAt: "12:00",
      slotKind: "small_elective",
      title: "小选修 · 自我教育",
      subtitle: "图书馆 · 个人课程",
      state: "upcoming",
    },
    {
      slotId: "s-3",
      startsAt: "14:00",
      endsAt: "16:00",
      slotKind: "required",
      course: byId("c-walk"),
      title: "城市漫游",
      subtitle: "2F 天台集合 · 带防晒",
      state: "upcoming",
      change: {
        id: "ch-1",
        changeType: "location",
        message: "今天 14:00 的「城市漫游」改到 2F 天台集合，记得带一件防晒的东西。",
        newLocation: "2F 天台",
      },
    },
    {
      slotId: "s-4",
      startsAt: "19:30",
      endsAt: "20:30",
      slotKind: "free",
      title: "自由发生",
      subtitle: "还没决定，留一扇门开着",
      state: "free",
    },
  ];
}

export async function getCourseFeed(): Promise<FeedPost[]> {
  return [
    {
      id: "p-1",
      course: byId("c-method"),
      title: "今天的怪问题收集：什么是“有用”的学习？",
      excerpt: "如果一个知识暂时不能兑换成任何东西，它还算有用吗？先别急着回答，下午带着一个反例来。",
      publishedAtLabel: "20 分钟前",
      commentCount: 4,
      watching: 7,
      kind: "text",
    },
    {
      id: "p-2",
      course: byId("c-walk"),
      title: "去天台之前，先看这 6 张照片",
      excerpt: "一份关于“城市缝隙”的观察作业。",
      publishedAtLabel: "昨天",
      commentCount: 11,
      kind: "photo",
    },
    {
      id: "p-3",
      course: byId("c-read"),
      title: "本周共读：第 4 章的那段下划线",
      excerpt: "“我们以为自己在寻找答案，实际上是在寻找一种能陪伴问题的方式。”",
      publishedAtLabel: "2 小时前",
      commentCount: 6,
      kind: "text",
    },
    {
      id: "p-4",
      course: byId("c-make"),
      title: "做事课开工：这周一起把地图推进 30%",
      excerpt: "看板已经摆好，挑一个你想认领的卡片。",
      publishedAtLabel: "3 小时前",
      commentCount: 2,
      kind: "text",
    },
  ];
}

export async function getPulse(): Promise<PulseItem[]> {
  return [
    { id: "pl-1", user: USERS.siqi, verb: "在写", what: "毕业旅行的预算表", timeLabel: "刚刚" },
    { id: "pl-2", user: USERS.linyuan, verb: "正在", what: "图书馆 3 楼看书", timeLabel: "8m" },
    { id: "pl-3", user: USERS.yueyue, verb: "想找人", what: "今晚一起做陶", timeLabel: "23m" },
  ];
}

export async function getMyScore(): Promise<ScoreSummary> {
  return { score: 98, max: 100, note: "稳定得像一张刚晒好的床单。" };
}

export async function getReadingSummary(): Promise<ReadingSummary> {
  return { thisWeek: "2h 40m", bookTitle: "也许你该找个人聊聊", bookAuthor: "洛莉·戈特利布", progress: 62 };
}

// ===== 课程详情 / 帖子 / 评论（mock）=====

type PostSeed = {
  courseId: string;
  author: UserLite;
  kind: "text" | "photo";
  label: string;
  title: string;
  body: string;
  images: number;
  comments: { user: UserLite; body: string; time: string }[];
};

// 帖子 id 与首页 feed 对齐（p-1..p-4 同源）。
const POST_DETAILS: Record<string, PostSeed> = {
  "p-1": {
    courseId: "c-method",
    author: USERS.david,
    kind: "text",
    label: "20 分钟前",
    title: "今天的怪问题收集：什么是“有用”的学习？",
    body: "如果一个知识暂时不能兑换成任何东西，它还算有用吗？\n\n先别急着回答。下午带着一个**反例**来——一个你觉得“没用但舍不得扔”的知识。\n\n我们今天不追求结论，只追求把问题问得更准一点。",
    images: 0,
    comments: [
      { user: USERS.linyuan, body: "我带了：背圆周率。完全没用，但背的时候很爽。", time: "12m" },
      { user: USERS.siqi, body: "那“爽”算不算一种用？", time: "6m" },
    ],
  },
  "p-2": {
    courseId: "c-walk",
    author: USERS.david,
    kind: "photo",
    label: "昨天",
    title: "去天台之前，先看这 6 张照片",
    body: "一份关于“城市缝隙”的观察作业。\n\n注意那些**不被设计**的地方：空调外机之间、楼梯转角、招牌背面。城市的真话常常写在这些地方。",
    images: 3,
    comments: [{ user: USERS.yueyue, body: "第三张那个缝里居然有人种了葱。", time: "昨天" }],
  },
  "p-3": {
    courseId: "c-read",
    author: USERS.linyuan,
    kind: "text",
    label: "2 小时前",
    title: "本周共读：第 4 章的那段下划线",
    body: "“我们以为自己在寻找答案，实际上是在寻找一种能陪伴问题的方式。”\n\n这句话我读了三遍。把你被击中的一句也贴上来。",
    images: 0,
    comments: [],
  },
  "p-4": {
    courseId: "c-make",
    author: USERS.siqi,
    kind: "text",
    label: "3 小时前",
    title: "做事课开工：这周一起把地图推进 30%",
    body: "看板已经摆好，挑一个你想认领的卡片：\n\n- 调研：“不游客”到底是什么\n- 外出：拍下第一次去也会迷路的巷子\n- 设计：地图图例第一稿",
    images: 0,
    comments: [{ user: USERS.david, body: "我认领图例设计。", time: "1h" }],
  },
  "p-6": {
    courseId: "c-method",
    author: USERS.siqi,
    kind: "text",
    label: "前天",
    title: "上周方法论小结：把“想做”翻译成“下一步”",
    body: "一个练习：拿你卡住的任何事，写出**今天能做的最小一步**。不许超过 15 分钟。",
    images: 0,
    comments: [],
  },
  "p-7": {
    courseId: "c-read",
    author: USERS.yueyue,
    kind: "text",
    label: "周一",
    title: "为什么我们读不进去：环境还是注意力？",
    body: "试了一周“番茄钟 + 把手机放进另一个房间”。\n\n结论：不是读不进去，是**没给读书留位置**。",
    images: 0,
    comments: [{ user: USERS.linyuan, body: "同感，我把书放枕头上，睡前必翻两页。", time: "周一" }],
  },
};

function postsOf(courseId: string): PostListItem[] {
  return Object.entries(POST_DETAILS)
    .filter(([, d]) => d.courseId === courseId)
    .map(([id, d]) => ({
      id,
      title: d.title,
      excerpt: d.body.split("\n")[0],
      publishedAtLabel: d.label,
      commentCount: d.comments.length,
      kind: d.kind,
    }));
}

export async function getCourseList(): Promise<CourseListItem[]> {
  // hasUpdate（spec §2.2.1 的 48h 无状态派生，mock 近似为「label 含 分钟/小时/刚刚」）
  return COURSES.map((c) => {
    const fresh = postsOf(c.id).filter((p) => /分钟|小时|刚刚/.test(p.publishedAtLabel)).length;
    return { ...c, hasUpdate: fresh > 0, newCount: fresh };
  });
}

export async function getCourse(id: string): Promise<Course | null> {
  return COURSES.find((c) => c.id === id) ?? null;
}

export async function getCoursePosts(courseId: string): Promise<PostListItem[]> {
  return postsOf(courseId);
}

export async function getPost(postId: string): Promise<PostDetail | null> {
  const d = POST_DETAILS[postId];
  if (!d) return null;
  return {
    id: postId,
    course: byId(d.courseId),
    author: d.author,
    title: d.title,
    bodyMarkdown: d.body,
    images: Array.from({ length: d.images }, (_, i) => String(i)),
    publishedAtLabel: d.label,
  };
}

export async function getComments(postId: string): Promise<CommentItem[]> {
  const d = POST_DETAILS[postId];
  if (!d) return [];
  return d.comments.map((c, i) => ({
    id: `${postId}-cm-${i}`,
    author: c.user,
    body: c.body,
    timeLabel: c.time,
  }));
}
