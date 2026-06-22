import { describe, it, expect } from "vitest";
import {
  buildRRule,
  parseRRule,
  computeRecurUntil,
  expandWindow,
  describeRRule,
  withUntil,
} from "./recurrence";
import type { CalEvent, Recurrence } from "./types";

const DT = "2026-06-24T11:00:00.000Z"; // 起始（= 某周三 19:00 北京时间；中国无夏令时，UTC 展开即保 wall-clock）
const DT_END = "2026-06-24T12:00:00.000Z"; // +1h

function rec(p: Partial<Recurrence>): Recurrence {
  return {
    freq: p.freq ?? "weekly",
    interval: p.interval ?? 1,
    byWeekday: p.byWeekday ?? [],
    endMode: p.endMode ?? "never",
    until: p.until ?? null,
    count: p.count ?? null,
  };
}

function row(p: Partial<CalEvent> & { id: string }): CalEvent {
  return {
    id: p.id,
    calendarId: p.calendarId ?? "cal1",
    title: p.title ?? "T",
    startsAt: p.startsAt ?? DT,
    endsAt: p.endsAt ?? DT_END,
    allDay: p.allDay ?? false,
    kind: p.kind ?? "event",
    status: p.status ?? "confirmed",
    location: p.location ?? null,
    rrule: p.rrule ?? null,
    recurUntil: p.recurUntil ?? null,
    seriesId: p.seriesId ?? null,
    occurrenceStart: p.occurrenceStart ?? null,
  };
}

describe("buildRRule", () => {
  it("daily → FREQ=DAILY（interval 1 省略）", () => {
    expect(buildRRule(rec({ freq: "daily" }), DT)).toBe("FREQ=DAILY");
  });
  it("weekly 多选周几 → BYDAY（0=周一..6=周日）", () => {
    expect(buildRRule(rec({ freq: "weekly", byWeekday: [0, 2] }), DT)).toBe("FREQ=WEEKLY;BYDAY=MO,WE");
  });
  it("monthly → 从 dtstart 取 BYMONTHDAY", () => {
    expect(buildRRule(rec({ freq: "monthly" }), DT)).toBe("FREQ=MONTHLY;BYMONTHDAY=24");
  });
  it("yearly → FREQ=YEARLY", () => {
    expect(buildRRule(rec({ freq: "yearly" }), DT)).toBe("FREQ=YEARLY");
  });
  it("interval + count", () => {
    expect(buildRRule(rec({ freq: "daily", interval: 2, endMode: "count", count: 5 }), DT)).toBe(
      "FREQ=DAILY;INTERVAL=2;COUNT=5",
    );
  });
  it("until → 含 UNTIL（UTC 串）", () => {
    const s = buildRRule(rec({ freq: "weekly", endMode: "until", until: "2026-12-31" }), DT);
    expect(s.startsWith("FREQ=WEEKLY")).toBe(true);
    expect(s).toContain("UNTIL=20261231T235959Z");
  });
});

describe("parseRRule（round-trip）", () => {
  it("weekly 多选周几", () => {
    const r = parseRRule("FREQ=WEEKLY;BYDAY=MO,WE", DT);
    expect(r.freq).toBe("weekly");
    expect(r.byWeekday).toEqual([0, 2]);
    expect(r.interval).toBe(1);
    expect(r.endMode).toBe("never");
  });
  it("interval + count", () => {
    const r = parseRRule("FREQ=DAILY;INTERVAL=2;COUNT=5", DT);
    expect(r.freq).toBe("daily");
    expect(r.interval).toBe(2);
    expect(r.endMode).toBe("count");
    expect(r.count).toBe(5);
  });
});

describe("computeRecurUntil", () => {
  it("never → null", () => {
    expect(computeRecurUntil(rec({ freq: "weekly" }), DT)).toBeNull();
  });
  it("count=3 weekly → 末次 = 起始 + 14 天", () => {
    const u = computeRecurUntil(rec({ freq: "weekly", endMode: "count", count: 3 }), DT);
    expect(u).toBe("2026-07-08T11:00:00.000Z");
  });
});

describe("expandWindow", () => {
  const FROM = "2026-06-24T00:00:00.000Z";
  const TO = "2026-07-22T00:00:00.000Z"; // 4 周窗

  it("普通单次：窗内返回，isRecurring=false，id 不变", () => {
    const rows = [row({ id: "s1", startsAt: "2026-06-25T03:00:00.000Z", endsAt: "2026-06-25T04:00:00.000Z" })];
    const out = expandWindow(rows, FROM, TO);
    expect(out).toHaveLength(1);
    expect(out[0].instanceId).toBe("s1");
    expect(out[0].isRecurring).toBe(false);
    expect(out[0].seriesRrule).toBeNull();
  });

  it("每周母事件：窗内展开 4 次，合成 id，isRecurring=true", () => {
    const rows = [row({ id: "m1", rrule: "FREQ=WEEKLY" })];
    const out = expandWindow(rows, FROM, TO);
    expect(out).toHaveLength(4);
    expect(out.map((i) => i.startsAt)).toEqual([
      "2026-06-24T11:00:00.000Z",
      "2026-07-01T11:00:00.000Z",
      "2026-07-08T11:00:00.000Z",
      "2026-07-15T11:00:00.000Z",
    ]);
    expect(out[0].instanceId).toBe("m1::2026-06-24T11:00:00.000Z");
    expect(out[0].isRecurring).toBe(true);
    expect(out[0].masterId).toBe("m1");
    expect(out[0].seriesRrule).toBe("FREQ=WEEKLY");
  });

  it("exception（cancelled 子行）跳过那一次", () => {
    const rows = [
      row({ id: "m1", rrule: "FREQ=WEEKLY" }),
      row({ id: "x1", seriesId: "m1", occurrenceStart: "2026-07-01T11:00:00.000Z", status: "cancelled" }),
    ];
    const out = expandWindow(rows, FROM, TO);
    expect(out).toHaveLength(3);
    expect(out.map((i) => i.startsAt)).not.toContain("2026-07-01T11:00:00.000Z");
  });

  it("override 子行替换那一次（新标题/时间），带 overrideId", () => {
    const rows = [
      row({ id: "m1", rrule: "FREQ=WEEKLY" }),
      row({
        id: "o1",
        seriesId: "m1",
        occurrenceStart: "2026-07-01T11:00:00.000Z",
        title: "改过的",
        startsAt: "2026-07-02T11:00:00.000Z",
        endsAt: "2026-07-02T12:00:00.000Z",
      }),
    ];
    const out = expandWindow(rows, FROM, TO);
    expect(out).toHaveLength(4);
    const moved = out.find((i) => i.title === "改过的");
    expect(moved).toBeTruthy();
    expect(moved!.startsAt).toBe("2026-07-02T11:00:00.000Z");
    expect(moved!.overrideId).toBe("o1");
    expect(moved!.occurrenceStart).toBe("2026-07-01T11:00:00.000Z");
  });

  it("UNTIL 生效：不产出截止后的次数", () => {
    const rows = [row({ id: "m1", rrule: "FREQ=WEEKLY;UNTIL=20260701T235959Z" })];
    const out = expandWindow(rows, FROM, TO);
    expect(out).toHaveLength(2);
  });

  it("被移出原位的 override：原 occ 在窗外、新时间在窗内 → 仍渲染", () => {
    const rows = [
      row({ id: "m1", rrule: "FREQ=WEEKLY;COUNT=2", recurUntil: "2026-07-01T11:00:00.000Z" }),
      row({
        id: "o1",
        seriesId: "m1",
        occurrenceStart: "2026-07-01T11:00:00.000Z",
        title: "移到九月",
        startsAt: "2026-09-01T11:00:00.000Z",
        endsAt: "2026-09-01T12:00:00.000Z",
      }),
    ];
    const out = expandWindow(rows, "2026-08-25T00:00:00.000Z", "2026-09-08T00:00:00.000Z");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("移到九月");
    expect(out[0].overrideId).toBe("o1");
  });
});

describe("时区（北京 +08:00）回归", () => {
  it("buildRRule monthly 用北京日：北京1/1凌晨1点(=前日17:00Z) → BYMONTHDAY=1（recur#2）", () => {
    expect(buildRRule(rec({ freq: "monthly" }), "2025-12-31T17:00:00.000Z")).toBe("FREQ=MONTHLY;BYMONTHDAY=1");
  });
  it("凌晨月重复展开落北京每月1号，不跳过2月", () => {
    const rows = [
      row({ id: "m", rrule: "FREQ=MONTHLY;BYMONTHDAY=1", startsAt: "2025-12-31T17:00:00.000Z", endsAt: "2025-12-31T18:00:00.000Z" }),
    ];
    const out = expandWindow(rows, "2025-12-31T16:00:00.000Z", "2026-03-15T00:00:00.000Z");
    expect(out.map((i) => i.startsAt)).toEqual([
      "2025-12-31T17:00:00.000Z",
      "2026-01-31T17:00:00.000Z",
      "2026-02-28T17:00:00.000Z",
    ]);
  });
  it("describeRRule 用北京时区显示 19:00（不随运行时区漂移，recur#1）", () => {
    expect(describeRRule("FREQ=WEEKLY", "2026-06-24T11:00:00.000Z")).toContain("19:00");
  });
});

describe("describeRRule（人话）", () => {
  it("每周多选周几", () => {
    const s = describeRRule("FREQ=WEEKLY;BYDAY=MO,WE", DT);
    expect(s).toContain("每周");
    expect(s).toContain("一");
    expect(s).toContain("三");
  });
  it("每天", () => {
    expect(describeRRule("FREQ=DAILY", DT)).toContain("每天");
  });
});

describe("withUntil（系列拆分用）", () => {
  it("追加 UNTIL 并去掉 COUNT", () => {
    expect(withUntil("FREQ=WEEKLY;COUNT=10", "2026-07-01T11:00:00.000Z")).toBe("FREQ=WEEKLY;UNTIL=20260701T110000Z");
  });
  it("替换已有 UNTIL", () => {
    expect(withUntil("FREQ=DAILY;UNTIL=20261231T235959Z", "2026-07-01T11:00:00.000Z")).toBe(
      "FREQ=DAILY;UNTIL=20260701T110000Z",
    );
  });
});
