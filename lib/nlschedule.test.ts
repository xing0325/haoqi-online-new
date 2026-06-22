import { describe, it, expect } from "vitest";
import { parseNL } from "./nlschedule";

// 参考此刻：2026-06-23（周二）10:00 本地时间
const NOW = new Date(2026, 5, 23, 10, 0, 0, 0);
const at = (mo0: number, d: number, h = 0, mi = 0) => new Date(2026, mo0, d, h, mi, 0, 0).getTime();

describe("parseNL — 时间 + 标题", () => {
  it("明天下午3点开会", () => {
    const r = parseNL("明天下午3点开会", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 24, 15));
    expect(r.end.getTime()).toBe(at(5, 24, 16)); // 默认 1 小时
    expect(r.title).toBe("开会");
    expect(r.allDay).toBe(false);
    expect(r.recurrence).toBeNull();
  });
  it("后天上午10点到11点半 项目评审", () => {
    const r = parseNL("后天上午10点到11点半 项目评审", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 25, 10));
    expect(r.end.getTime()).toBe(at(5, 25, 11, 30));
    expect(r.title).toBe("项目评审");
  });
  it("11点开会（无日期=今天）", () => {
    const r = parseNL("11点开会", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 11));
    expect(r.title).toBe("开会");
  });
  it("中午12点 午饭", () => {
    expect(parseNL("中午12点 午饭", NOW)!.start.getTime()).toBe(at(5, 23, 12));
  });
  it("晚上8点和朋友吃饭", () => {
    const r = parseNL("晚上8点和朋友吃饭", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 20));
    expect(r.title).toBe("和朋友吃饭");
  });
  it("明天下午开会（只有时段，无小时 → 14:00）", () => {
    expect(parseNL("明天下午开会", NOW)!.start.getTime()).toBe(at(5, 24, 14));
  });
});

describe("parseNL — 日期", () => {
  it("下周一9点写稿（下周=下一个自然周）", () => {
    expect(parseNL("下周一9点写稿", NOW)!.start.getTime()).toBe(at(5, 29, 9));
  });
  it("周五交报告（无时间 → 全天）", () => {
    const r = parseNL("周五交报告", NOW)!;
    expect(r.allDay).toBe(true);
    expect(r.start.getTime()).toBe(at(5, 26, 0));
    expect(r.title).toBe("交报告");
  });
  it("6月30号下午2点答辩", () => {
    expect(parseNL("6月30号下午2点答辩", NOW)!.start.getTime()).toBe(at(5, 30, 14));
  });
});

describe("parseNL — 时长", () => {
  it("下午3点开会2小时", () => {
    const r = parseNL("下午3点开会2小时", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 15));
    expect(r.end.getTime()).toBe(at(5, 23, 17));
  });
  it("明天10点 培训 半小时", () => {
    const r = parseNL("明天10点 培训 半小时", NOW)!;
    expect(r.end.getTime() - r.start.getTime()).toBe(30 * 60000);
  });
});

describe("parseNL — 重复 + 提醒词剥离", () => {
  it("每周三晚上7点排练", () => {
    const r = parseNL("每周三晚上7点排练", NOW)!;
    expect(r.recurrence).toEqual({ freq: "weekly", interval: 1, byWeekday: [2], endMode: "never", until: null, count: null });
    expect(r.start.getTime()).toBe(at(5, 24, 19)); // 最近的周三
    expect(r.title).toBe("排练");
  });
  it("每天早上8点晨会", () => {
    const r = parseNL("每天早上8点晨会", NOW)!;
    expect(r.recurrence?.freq).toBe("daily");
    expect(r.start.getTime()).toBe(at(5, 23, 8));
    expect(r.title).toBe("晨会");
  });
  it("每周二、四18点健身", () => {
    const r = parseNL("每周二、四18点健身", NOW)!;
    expect(r.recurrence?.byWeekday).toEqual([1, 3]);
    expect(r.title).toBe("健身");
  });
  it("每周日上午10点复盘", () => {
    const r = parseNL("每周日上午10点复盘", NOW)!;
    expect(r.recurrence?.byWeekday).toEqual([6]);
    expect(r.start.getTime()).toBe(at(5, 28, 10));
  });
  it("剥离“提醒我”/标点", () => {
    const r = parseNL("明天上午9点到10点 站会，提醒我", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 24, 9));
    expect(r.end.getTime()).toBe(at(5, 24, 10));
    expect(r.title).toBe("站会");
  });
});

describe("parseNL — 审查回归（午夜/跨时段/时长/凌晨/零时长）", () => {
  it("晚上12点 = 次日午夜 00:00（bug#1）", () => {
    const r = parseNL("晚上12点睡觉", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 24, 0, 0));
    expect(r.title).toBe("睡觉");
  });
  it("跨时段范围 上午9点到下午2点（bug#2）", () => {
    const r = parseNL("上午9点到下午2点 长会", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 9));
    expect(r.end.getTime()).toBe(at(5, 23, 14));
    expect(r.title).toBe("长会");
  });
  it("跨时段范围 早上10点到晚上8点", () => {
    const r = parseNL("早上10点到晚上8点 布展", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 10));
    expect(r.end.getTime()).toBe(at(5, 23, 20));
  });
  it("半小时与分钟互斥，不叠加（bug#3）", () => {
    expect(parseNL("3点 半小时30分钟", NOW)!.end.getTime() - parseNL("3点 半小时30分钟", NOW)!.start.getTime()).toBe(30 * 60000);
  });
  it("1小时30分钟仍为90分钟", () => {
    const r = parseNL("明天3点 1小时30分钟", NOW)!;
    expect(r.end.getTime() - r.start.getTime()).toBe(90 * 60000);
  });
  it("凌晨被识别且不污染标题（bug#4）", () => {
    const r = parseNL("凌晨2点赶火车", NOW)!;
    expect(r.start.getTime()).toBe(at(5, 23, 2));
    expect(r.title).toBe("赶火车");
  });
  it("end==start 不当跨天 24h（bug#5）", () => {
    const r = parseNL("3点到3点 测试", NOW)!;
    expect(r.end.getTime() - r.start.getTime()).toBe(60 * 60000);
  });
});

describe("parseNL — 无法解析", () => {
  it("没有日期也没有时间 → null", () => {
    expect(parseNL("随便写点什么", NOW)).toBeNull();
  });
  it("空 → null", () => {
    expect(parseNL("", NOW)).toBeNull();
  });
});
