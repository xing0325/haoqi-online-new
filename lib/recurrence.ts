// 重复事件纯函数：RRULE 构造/解析、窗口展开、例外合并、人话描述。
// 约定：byWeekday 0=周一..6=周日（与 rrule.js .weekday 一致）。中国无夏令时 → 统一 UTC 展开即保 wall-clock。
import { rrulestr, type RRule } from "rrule";
import type { CalEvent, CalInstance, Recurrence, RecurFreq } from "./types";

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const WD_CN = ["一", "二", "三", "四", "五", "六", "日"];

// ISO → RFC5545 基本格式 UTC：YYYYMMDDTHHMMSSZ
function toRRuleUTC(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// "到某天"(YYYY-MM-DD) → 当天 23:59:59 UTC 的 RRULE UNTIL
function untilToRRule(untilDate: string): string {
  const iso = untilDate.length <= 10 ? `${untilDate}T23:59:59.000Z` : new Date(untilDate).toISOString();
  return toRRuleUTC(iso);
}

// "20261231T235959Z" → "2026-12-31"
function rruleUntilToDate(u: string): string {
  const m = u.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : u;
}

// 北京固定 +08:00（中国无夏令时）：把真实瞬时 +8h 当伪 UTC，按北京"墙上时间"展开/取分量。
const BJ = 8 * 3600 * 1000;
const toBJ = (iso: string) => new Date(new Date(iso).getTime() + BJ);
function fromRRuleUTC(s: string): Date {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : new Date(s);
}

function makeRule(rruleStr: string, dtstartISO: string): RRule {
  // UNTIL 必须与 occurrence 同帧（都 +8h 伪 UTC），否则有效截止偏 8 小时（含 split 的 occ 边界）。
  const shifted = rruleStr.replace(
    /UNTIL=(\d{8}T\d{6}Z)/i,
    (_m, v) => `UNTIL=${toRRuleUTC(new Date(fromRRuleUTC(v).getTime() + BJ).toISOString())}`,
  );
  return rrulestr(`DTSTART:${toRRuleUTC(toBJ(dtstartISO).toISOString())}\nRRULE:${shifted}`) as RRule;
}

/** 给 RRULE 串设置 UNTIL（去掉 COUNT/旧 UNTIL）；系列拆分时给旧母封口。 */
export function withUntil(rruleStr: string, untilInstantISO: string): string {
  const parts = rruleStr.split(";").filter((p) => p && !/^(UNTIL|COUNT)=/i.test(p));
  parts.push(`UNTIL=${toRRuleUTC(untilInstantISO)}`);
  return parts.join(";");
}

/** 结构化重复 → RRULE 串（不含 DTSTART）。 */
export function buildRRule(rec: Recurrence, dtstartISO: string): string {
  const parts: string[] = [`FREQ=${rec.freq.toUpperCase()}`];
  if (rec.interval && rec.interval > 1) parts.push(`INTERVAL=${rec.interval}`);
  if (rec.freq === "weekly" && rec.byWeekday.length) {
    parts.push(`BYDAY=${rec.byWeekday.map((n) => BYDAY[n]).join(",")}`);
  }
  if (rec.freq === "monthly") parts.push(`BYMONTHDAY=${toBJ(dtstartISO).getUTCDate()}`);
  if (rec.endMode === "count" && rec.count) parts.push(`COUNT=${rec.count}`);
  if (rec.endMode === "until" && rec.until) parts.push(`UNTIL=${untilToRRule(rec.until)}`);
  return parts.join(";");
}

/** RRULE 串 → 结构化（给精简档编辑器）。复杂规则按已知键尽力解析。 */
export function parseRRule(rruleStr: string, _dtstartISO: string): Recurrence {
  const map: Record<string, string> = {};
  for (const kv of rruleStr.split(";")) {
    const [k, v] = kv.split("=");
    if (k) map[k.toUpperCase()] = v ?? "";
  }
  const freq = (map.FREQ || "WEEKLY").toLowerCase() as RecurFreq;
  const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1;
  const byWeekday = map.BYDAY
    ? map.BYDAY.split(",").map((d) => BYDAY.indexOf(d.trim())).filter((n) => n >= 0)
    : [];
  let endMode: Recurrence["endMode"] = "never";
  let until: string | null = null;
  let count: number | null = null;
  if (map.COUNT) {
    endMode = "count";
    count = parseInt(map.COUNT, 10);
  } else if (map.UNTIL) {
    endMode = "until";
    until = rruleUntilToDate(map.UNTIL);
  }
  return { freq, interval, byWeekday, endMode, until, count };
}

/** 末次出现起始（剪枝用）：never→null；until→UNTIL 时刻；count→第 N 次起始。 */
// durationMs：单次时长。recur_until 存"末次结束时刻"以便范围查询不漏跨界（午夜）实例。
export function computeRecurUntil(rec: Recurrence, dtstartISO: string, durationMs = 0): string | null {
  if (rec.endMode === "never") return null;
  if (rec.endMode === "until" && rec.until) {
    const iso = rec.until.length <= 10 ? `${rec.until}T23:59:59.000Z` : rec.until;
    return new Date(new Date(iso).getTime() + durationMs).toISOString();
  }
  if (rec.endMode === "count" && rec.count) {
    const all = makeRule(buildRRule(rec, dtstartISO), dtstartISO).all();
    const last = all[all.length - 1];
    return last ? new Date(last.getTime() - BJ + durationMs).toISOString() : null;
  }
  return null;
}

// ---- 展开 ----

function single(r: CalEvent): CalInstance {
  return {
    instanceId: r.id,
    masterId: null,
    occurrenceStart: null,
    overrideId: null,
    calendarId: r.calendarId,
    title: r.title,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    allDay: r.allDay,
    kind: r.kind,
    status: r.status,
    location: r.location,
    isRecurring: false,
    seriesRrule: null,
  };
}

function masterInstance(m: CalEvent, occ: Date, durationMs: number, occISO: string): CalInstance {
  return {
    instanceId: `${m.id}::${occISO}`,
    masterId: m.id,
    occurrenceStart: occISO,
    overrideId: null,
    calendarId: m.calendarId,
    title: m.title,
    startsAt: occ.toISOString(),
    endsAt: new Date(occ.getTime() + durationMs).toISOString(),
    allDay: m.allDay,
    kind: m.kind,
    status: m.status,
    location: m.location,
    isRecurring: true,
    seriesRrule: m.rrule,
  };
}

function overrideInstance(
  masterId: string,
  child: CalEvent,
  occISO: string,
  masterRrule: string | null,
): CalInstance {
  return {
    instanceId: `${masterId}::${occISO}`,
    masterId,
    occurrenceStart: occISO,
    overrideId: child.id,
    calendarId: child.calendarId,
    title: child.title,
    startsAt: child.startsAt,
    endsAt: child.endsAt,
    allDay: child.allDay,
    kind: child.kind,
    status: child.status,
    location: child.location,
    isRecurring: true,
    seriesRrule: masterRrule,
  };
}

/** 把母事件/子行/单次行，在 [from,to] 窗内展开成可渲染实例（套例外、含被移入的 override）。 */
export function expandWindow(rows: CalEvent[], fromISO: string, toISO: string): CalInstance[] {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const singles = rows.filter((r) => !r.rrule && !r.seriesId);
  const masters = rows.filter((r) => r.rrule && !r.seriesId);
  const children = rows.filter((r) => r.seriesId && r.occurrenceStart);
  const masterRruleById = new Map(masters.map((m) => [m.id, m.rrule] as const));

  // seriesId → occISO → child
  const childIndex = new Map<string, Map<string, CalEvent>>();
  for (const c of children) {
    const key = new Date(c.occurrenceStart!).toISOString();
    if (!childIndex.has(c.seriesId!)) childIndex.set(c.seriesId!, new Map());
    childIndex.get(c.seriesId!)!.set(key, c);
  }

  const out: CalInstance[] = [];
  const consumed = new Set<string>();

  // 1. 普通单次（与窗相交）
  for (const s of singles) {
    if (new Date(s.startsAt).getTime() < toMs && new Date(s.endsAt).getTime() > fromMs) out.push(single(s));
  }

  // 2. 母事件展开 + 套例外
  for (const m of masters) {
    const rule = makeRule(m.rrule!, m.startsAt);
    const durationMs = new Date(m.endsAt).getTime() - new Date(m.startsAt).getTime();
    const cidx = childIndex.get(m.id);
    for (const pseudoOcc of rule.between(new Date(from.getTime() + BJ), new Date(to.getTime() + BJ), true)) {
      const occ = new Date(pseudoOcc.getTime() - BJ); // 伪 UTC → 真实瞬时
      const occISO = occ.toISOString();
      consumed.add(`${m.id}::${occISO}`);
      const child = cidx?.get(occISO);
      if (child) {
        if (child.status === "cancelled") continue; // exception：删一次
        out.push(overrideInstance(m.id, child, occISO, m.rrule)); // override：改一次
      } else {
        out.push(masterInstance(m, occ, durationMs, occISO));
      }
    }
  }

  // 3. 被移出原位的 override（原 occ 在窗外、新时间在窗内）
  for (const c of children) {
    if (c.status === "cancelled") continue;
    const occISO = new Date(c.occurrenceStart!).toISOString();
    if (consumed.has(`${c.seriesId}::${occISO}`)) continue;
    if (new Date(c.startsAt).getTime() < toMs && new Date(c.endsAt).getTime() > fromMs) {
      out.push(overrideInstance(c.seriesId!, c, occISO, masterRruleById.get(c.seriesId!) ?? null));
    }
  }

  out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return out;
}

// ---- 人话 ----

/** RRULE → 中文描述，如「每周一、三 19:00，到 2026-12-31」。 */
export function describeRRule(rruleStr: string, dtstartISO: string): string {
  const rec = parseRRule(rruleStr, dtstartISO);
  const d = toBJ(dtstartISO);
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

  let base = "";
  if (rec.freq === "daily") base = rec.interval > 1 ? `每 ${rec.interval} 天` : "每天";
  else if (rec.freq === "weekly") {
    if (rec.byWeekday.length) {
      const days = "周" + rec.byWeekday.slice().sort((a, b) => a - b).map((n) => WD_CN[n]).join("、");
      base = rec.interval > 1 ? `每 ${rec.interval} 周 ${days}` : `每${days}`;
    } else base = rec.interval > 1 ? `每 ${rec.interval} 周` : "每周";
  } else if (rec.freq === "monthly") base = `每月 ${d.getUTCDate()} 号`;
  else if (rec.freq === "yearly") base = `每年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;

  let end = "";
  if (rec.endMode === "until" && rec.until) end = `，到 ${rec.until}`;
  else if (rec.endMode === "count" && rec.count) end = `，共 ${rec.count} 次`;

  return `${base} ${time}${end}`;
}
