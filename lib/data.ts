// 取数层（首切片 mock 实现）。所有函数返回 Promise，签名即未来 Supabase 客户端版本的契约；
// 拿到 Supabase key 后只替换这些函数体（改成 createClient().from(...).select(...)），UI 不动。
//
// 诚实标注：当前为示例数据，非真实业务状态。示例姓名/积分/日期不可当真。

import type {
  Course,
  FeedPost,
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
