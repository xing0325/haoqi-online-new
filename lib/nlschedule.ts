// 中文自然语言 → 日程（客户端纯解析，无 LLM/后端）。日历"一句话建日程"对话框用。
// 解析失败返回 null（调用方回退到手动表单）。约定见 nlschedule.test.ts。
import type { Recurrence } from "./types";

const WD: Record<string, number> = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };

export type NLResult = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurrence: Recurrence | null;
} | null;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
const dow0Mon = (d: Date) => (d.getDay() + 6) % 7;
function upcoming(now: Date, t: number): Date {
  const x = startOfDay(now);
  x.setDate(x.getDate() + ((t - dow0Mon(now) + 7) % 7));
  return x;
}
function nextWeek(now: Date, t: number, weeks = 1): Date {
  const x = startOfDay(now);
  x.setDate(x.getDate() - dow0Mon(now) + 7 * weeks + t);
  return x;
}
const esc = (s: string) => s.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");

export function parseNL(text: string, now: Date): NLResult {
  if (!text || !text.trim()) return null;
  let rest = ` ${text.trim()} `;
  const strip = (re: RegExp) => {
    rest = rest.replace(re, " ");
  };

  // ---- 重复 ----
  let recurrence: Recurrence | null = null;
  const weeklyM = rest.match(/每(?:周|星期|礼拜)\s*([一二三四五六日天](?:\s*[、和及与,，]?\s*[一二三四五六日天])*)/);
  if (weeklyM) {
    const days = (weeklyM[1].match(/[一二三四五六日天]/g) || []).map((c) => WD[c]);
    recurrence = {
      freq: "weekly",
      interval: 1,
      byWeekday: [...new Set(days)].sort((a, b) => a - b),
      endMode: "never",
      until: null,
      count: null,
    };
    strip(new RegExp(esc(weeklyM[0])));
  } else if (/每(?:天|日)/.test(rest)) {
    recurrence = { freq: "daily", interval: 1, byWeekday: [], endMode: "never", until: null, count: null };
    strip(/每(?:天|日)/);
  }

  // ---- 日期 ----
  let day: Date | null = null;
  let hasDay = false;
  const absM = rest.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/) || rest.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (absM) {
    day = startOfDay(now);
    day.setMonth(parseInt(absM[1], 10) - 1, parseInt(absM[2], 10));
    hasDay = true;
    strip(new RegExp(esc(absM[0])));
  } else if (/大后天/.test(rest)) {
    day = startOfDay(now);
    day.setDate(day.getDate() + 3);
    hasDay = true;
    strip(/大后天/);
  } else if (/后天/.test(rest)) {
    day = startOfDay(now);
    day.setDate(day.getDate() + 2);
    hasDay = true;
    strip(/后天/);
  } else if (/明(?:天|日|早|晚)/.test(rest)) {
    day = startOfDay(now);
    day.setDate(day.getDate() + 1);
    hasDay = true;
    strip(/明(?:天|日)/);
  } else if (/今(?:天|日)/.test(rest)) {
    day = startOfDay(now);
    hasDay = true;
    strip(/今(?:天|日)/);
  } else {
    const wkM = rest.match(/(下下|下|这|本)?\s*(?:周|星期|礼拜)\s*([一二三四五六日天])/);
    if (wkM) {
      const t = WD[wkM[2]];
      day = wkM[1] === "下" ? nextWeek(now, t, 1) : wkM[1] === "下下" ? nextWeek(now, t, 2) : upcoming(now, t);
      hasDay = true;
      strip(new RegExp(esc(wkM[0])));
    }
  }

  // ---- 时段（范围两端各自识别；午夜 = 次日 0 点）----
  type Cat = "am" | "noon" | "pm" | "eve" | null;
  const PERIODS = "上午|早上|早晨|清晨|今早|明早|凌晨|中午|正午|下午|午后|晚上|傍晚|夜里|今晚|明晚|夜晚|半夜|午夜";
  const cat = (w?: string): Cat => {
    if (!w) return null;
    if (/上午|早上|早晨|清晨|今早|明早|凌晨/.test(w)) return "am";
    if (/中午|正午/.test(w)) return "noon";
    if (/下午|午后/.test(w)) return "pm";
    if (/晚上|傍晚|夜里|今晚|明晚|夜晚|半夜|午夜/.test(w)) return "eve";
    return null;
  };
  const globalCat = cat((rest.match(new RegExp(PERIODS)) || [])[0]);
  // 返回 {h, bump(是否次日)}；晚上/夜里 12 点 = 次日 0 点
  const applyCat = (h: number, c: Cat): { h: number; bump: boolean } => {
    if ((c === "pm" || c === "eve") && h === 12) return { h: 0, bump: c === "eve" };
    if (c === "pm" || c === "eve") return { h: h < 12 ? h + 12 : h, bump: false };
    if (c === "am") return { h: h === 12 ? 0 : h, bump: false };
    if (c === "noon") return { h: h === 12 ? 12 : h < 6 ? h + 12 : h, bump: false };
    return { h, bump: false };
  };

  const minOf = (frag?: string) => (frag ? (/半/.test(frag) ? 30 : parseInt((frag.match(/(\d{1,2})/) || ["", "0"])[1], 10) || 0) : 0);
  let sh: number | null = null,
    sm = 0,
    eh: number | null = null,
    em = 0,
    bumpStart = false,
    bumpEnd = false;
  const P = `(${PERIODS})?`;
  const T = `\\s*(\\d{1,2})\\s*[点时](半|[:：]?\\d{1,2}分?)?`;
  const rangeM = rest.match(new RegExp(`${P}${T}\\s*(?:到|至|~|-|—|–)\\s*${P}${T}`));
  if (rangeM) {
    const sc = cat(rangeM[1]) ?? globalCat;
    const ec = cat(rangeM[4]) ?? cat(rangeM[1]) ?? globalCat;
    const a = applyCat(parseInt(rangeM[2], 10), sc);
    const b = applyCat(parseInt(rangeM[5], 10), ec);
    sh = a.h;
    bumpStart = a.bump;
    sm = minOf(rangeM[3]);
    eh = b.h;
    bumpEnd = b.bump;
    em = minOf(rangeM[6]);
    strip(new RegExp(esc(rangeM[0])));
  } else {
    const tM = rest.match(new RegExp(`${P}${T}`));
    if (tM) {
      const a = applyCat(parseInt(tM[2], 10), cat(tM[1]) ?? globalCat);
      sh = a.h;
      bumpStart = a.bump;
      sm = minOf(tM[3]);
      strip(new RegExp(esc(tM[0])));
    } else {
      const cM = rest.match(/(\d{1,2})[:：](\d{1,2})/);
      if (cM) {
        const a = applyCat(parseInt(cM[1], 10), globalCat);
        sh = a.h;
        bumpStart = a.bump;
        sm = parseInt(cM[2], 10);
        strip(new RegExp(esc(cM[0])));
      }
    }
  }
  if (sh === null && globalCat) sh = globalCat === "am" ? 9 : globalCat === "noon" ? 12 : globalCat === "pm" ? 14 : 19;
  const hasTime = sh !== null;
  strip(new RegExp(PERIODS, "g")); // 清残留时段词（标题用）

  // ---- 时长（半小时 与 分钟 互斥，不叠加）----
  let durMin: number | null = null;
  if (/半(?:个)?小时/.test(rest)) {
    durMin = 30;
    strip(/半(?:个)?小时/);
  } else {
    const hrM = rest.match(/(\d+)\s*(?:个)?\s*小时/);
    if (hrM) {
      durMin = parseInt(hrM[1], 10) * 60;
      strip(new RegExp(esc(hrM[0])));
    }
    const minM = rest.match(/(\d+)\s*分钟/);
    if (minM) {
      durMin = (durMin ?? 0) + parseInt(minM[1], 10);
      strip(new RegExp(esc(minM[0])));
    }
  }

  if (!hasDay && !hasTime && !recurrence) return null;

  // ---- base 日 ----
  let base: Date;
  if (recurrence?.freq === "weekly" && recurrence.byWeekday.length) {
    base = new Date(Math.min(...recurrence.byWeekday.map((w) => upcoming(now, w).getTime())));
  } else base = day ?? startOfDay(now);

  const allDay = !hasTime;
  const start = new Date(base);
  if (bumpStart) start.setDate(start.getDate() + 1);
  if (hasTime) start.setHours(sh as number, sm, 0, 0);
  const end = new Date(start);
  if (allDay) end.setDate(end.getDate() + 1);
  else if (eh !== null) {
    end.setHours(eh, em, 0, 0);
    if (bumpEnd && !bumpStart) end.setDate(end.getDate() + 1);
    if (end.getTime() < start.getTime()) end.setDate(end.getDate() + 1);
    if (end.getTime() === start.getTime()) end.setMinutes(end.getMinutes() + 60); // 零时长 → 默认 1h
  } else end.setMinutes(end.getMinutes() + (durMin ?? 60));

  // ---- 标题 ----
  let title = rest
    .replace(/(提醒我一下|提醒我|提醒一下|记得提醒我?|记得|别忘了)/g, " ")
    .replace(/[，。、,.!！?？:：;；~\-—()（）【】[\]"'《》]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) title = "新日程";

  return { title, start, end, allDay, recurrence };
}
