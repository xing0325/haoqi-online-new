"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, type EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import zhcn from "@fullcalendar/core/locales/zh-cn";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  cancelOccurrence,
  createEvent,
  createTask,
  deleteSeries,
  ensureDefaultCalendars,
  getEvent,
  getEventsForWindow,
  getMyCalendars,
  getScheduleAsRecurring,
  getTasks,
  scheduleTask,
  softDeleteEvent,
  softDeleteTask,
  splitSeries,
  truncateSeries,
  updateEvent,
  updateEventTime,
  updateOccurrence,
  updateSeries,
  updateTask,
} from "@/lib/data";
import { buildRRule, describeRRule, parseRRule } from "@/lib/recurrence";
import { detectMeetingLink } from "@/lib/meeting";
import { parseNL } from "@/lib/nlschedule";
import type { CalInstance, Calendar as Cal, EditScope, EventStatus, Recurrence, RecurFreq, ScheduleRecurring, Task } from "@/lib/types";
import TasksPanel from "./TasksPanel";
import s from "./Calendar.module.css";
import "./calendar-theme.css";

type RecurField = "none" | RecurFreq;

type FormState = {
  mode: "create" | "edit";
  // edit 上下文
  instanceId?: string;
  masterId?: string | null;
  occurrenceStart?: string | null;
  isRecurring?: boolean;
  seriesRrule?: string | null;
  // 字段
  title: string;
  start: string; // datetime-local
  end: string;
  kind: "event" | "timeblock";
  calendarId: string;
  location: string;
  status: EventStatus;
  allDay: boolean;
  // 重复（精简档）
  recurFreq: RecurField;
  recurWeekdays: number[]; // 0=周一..6=周日
  recurEndMode: "never" | "until" | "count";
  recurUntil: string; // yyyy-mm-dd
  recurCount: number;
  linkTaskId?: string; // 从任务停车场"安排"过来 → 存事件后回写 Task.scheduled_event_id
};

type ScopeAsk = {
  mode: "edit" | "delete";
  run: (scope: EditScope) => Promise<void>;
  onCancel: () => void;
} | null;

const WD_CN = ["一", "二", "三", "四", "五", "六", "日"];
const VIEWS: { key: string; label: string }[] = [
  { key: "multiMonthYear", label: "年" },
  { key: "dayGridMonth", label: "月" },
  { key: "timeGridWeek", label: "周" },
  { key: "timeGridDay", label: "日" },
  { key: "listWeek", label: "日程" },
];

// Date → datetime-local 字符串（本地时区）
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtRange(start: Date | null, end: Date | null, allDay?: boolean): string {
  if (!start) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  const d = `${start.getMonth() + 1}/${start.getDate()}`;
  if (allDay) return `${d} 全天`;
  const t = (x: Date) => `${p(x.getHours())}:${p(x.getMinutes())}`;
  return `${d} ${t(start)}${end ? "–" + t(end) : ""}`;
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// utc 星期（0=周一..6=周日），与 rrule 展开一致
function utcWeekday0Mon(iso: string): number {
  return (new Date(iso).getUTCDay() + 6) % 7;
}

// 浅底（纸感马卡龙：浅底 + 色边 + 深色文字）
const TINT: Record<string, string> = {
  "#e6c000": "#fff6c9",
  "#ef785e": "#ffe6df",
  "#5b9be0": "#e4f0fe",
  "#4cb88a": "#dcf3e6",
  "#ef8aa0": "#ffe1e7",
  "#aeb6c2": "#eef0f3",
};

function formToRecurrence(form: FormState, startISO: string): Recurrence | null {
  if (form.recurFreq === "none") return null;
  return {
    freq: form.recurFreq,
    interval: 1,
    byWeekday:
      form.recurFreq === "weekly"
        ? form.recurWeekdays.length
          ? [...form.recurWeekdays].sort((a, b) => a - b)
          : [utcWeekday0Mon(startISO)]
        : [],
    endMode: form.recurEndMode,
    until: form.recurEndMode === "until" && form.recurUntil ? form.recurUntil : null,
    count: form.recurEndMode === "count" ? form.recurCount : null,
  };
}

// 拖拽改星期时，把规律重新锚到新起点（仅 weekly 需要换 BYDAY）
function reanchor(rrule: string | null, newStartISO: string): Recurrence | null {
  if (!rrule) return null;
  const r = parseRRule(rrule, newStartISO);
  if (r.freq === "weekly") r.byWeekday = [utcWeekday0Mon(newStartISO)];
  return r;
}

const EMPTY_RECUR = {
  recurFreq: "none" as RecurField,
  recurWeekdays: [] as number[],
  recurEndMode: "never" as const,
  recurUntil: "",
  recurCount: 10,
};

export default function CalendarBoard() {
  const { session } = useAuth();
  const router = useRouter();
  const elRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<Calendar | null>(null);
  const calsRef = useRef<Record<string, Cal>>({});
  const courseRef = useRef<ScheduleRecurring[]>([]);
  const instRef = useRef<CalInstance[]>([]);
  const heatRef = useRef<Map<string, number>>(new Map());
  const rangeRef = useRef<{ from: string; to: string }>({ from: "", to: "" });
  const viewRef = useRef<string>("timeGridWeek");

  const [calList, setCalList] = useState<Cal[]>([]);
  const [layers, setLayers] = useState({ course: true, personal: true, work: true });
  const [showDone, setShowDone] = useState(false);
  const [showExpired, setShowExpired] = useState(true);
  const [view, setView] = useState<string>("timeGridWeek");
  const [form, setForm] = useState<FormState | null>(null);
  const [scopeAsk, setScopeAsk] = useState<ScopeAsk>(null);
  const [toast, setToast] = useState<{ msg: string; undo: (() => void) | null } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    title: string;
    time: string;
    location: string | null;
    meeting: string | null;
  } | null>(null);
  const [nlText, setNlText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pane, setPane] = useState<"calendar" | "tasks">("calendar"); // 第一屏=日历；任务做成 tab

  const layersRef = useRef(layers);
  layersRef.current = layers;
  const doneRef = useRef(showDone);
  doneRef.current = showDone;
  const expRef = useRef(showExpired);
  expRef.current = showExpired;

  function showToast(msg: string, undo: (() => void) | null) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function defaultCalId(): string {
    const cals = Object.values(calsRef.current);
    return (cals.find((c) => c.kind === "personal") ?? cals[0])?.id ?? "";
  }

  function overlaps(startISO: string, endISO: string, excludeId?: string): boolean {
    const a = new Date(startISO).getTime();
    const b = new Date(endISO).getTime();
    return instRef.current.some((e) => {
      if (e.instanceId === excludeId) return false;
      const x = new Date(e.startsAt).getTime();
      const y = new Date(e.endsAt).getTime();
      return a < y && b > x;
    });
  }

  function paintYearHeat() {
    if (viewRef.current !== "multiMonthYear" || !elRef.current) return;
    const cells = elRef.current.querySelectorAll<HTMLElement>(".fc-daygrid-day[data-date]");
    cells.forEach((cell) => {
      const d = cell.getAttribute("data-date") ?? "";
      const n = heatRef.current.get(d) ?? 0;
      const tier = n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3;
      cell.classList.remove("hq-heat-1", "hq-heat-2", "hq-heat-3");
      if (tier > 0) cell.classList.add(`hq-heat-${tier}`);
    });
  }

  function rebuild() {
    const cal = calRef.current;
    if (!cal) return;
    cal.removeAllEvents();
    const isYear = viewRef.current === "multiMonthYear";
    if (layersRef.current.course && !isYear) {
      for (const c of courseRef.current) {
        cal.addEvent({
          groupId: "course",
          title: c.title,
          daysOfWeek: c.daysOfWeek,
          startTime: c.startTime,
          endTime: c.endTime,
          backgroundColor: TINT[c.color] ?? "#eef0f3",
          borderColor: c.color,
          textColor: "#18243b",
          editable: false,
          classNames: ["fc-course"],
          extendedProps: { courseId: c.courseId, isCourse: true },
        } as EventInput);
      }
    }
    const now = Date.now();
    const heat = new Map<string, number>();
    for (const e of instRef.current) {
      const meta = calsRef.current[e.calendarId];
      if (!meta) continue;
      if (meta.kind === "personal" && !layersRef.current.personal) continue;
      if (meta.kind === "work" && !layersRef.current.work) continue;
      if (e.status === "cancelled") continue;
      if (e.status === "done" && !doneRef.current) continue;
      if (new Date(e.endsAt).getTime() < now && !expRef.current) continue;
      heat.set(dateKey(e.startsAt), (heat.get(dateKey(e.startsAt)) ?? 0) + 1);
      if (isYear) continue; // 年视图只画热力，不铺事件节点
      const cls: string[] = [];
      if (e.kind === "timeblock") cls.push("fc-tb");
      if (e.status === "done") cls.push("fc-done");
      if (e.status === "draft") cls.push("fc-draft");
      if (e.isRecurring) cls.push("fc-recur");
      if (e.status === "confirmed" && new Date(e.startsAt).getTime() <= now && new Date(e.endsAt).getTime() > now)
        cls.push("fc-live");
      cal.addEvent({
        id: e.instanceId,
        title: e.title,
        start: e.startsAt,
        end: e.endsAt,
        allDay: e.allDay,
        editable: true,
        backgroundColor: TINT[meta.color ?? ""] ?? "#e4f0fe",
        borderColor: meta.color ?? "#5b9be0",
        textColor: "#18243b",
        classNames: cls,
        extendedProps: {
          calendarId: e.calendarId,
          kind: e.kind,
          status: e.status,
          location: e.location,
          isRecurring: e.isRecurring,
          masterId: e.masterId,
          occurrenceStart: e.occurrenceStart,
          seriesRrule: e.seriesRrule,
        },
      });
    }
    heatRef.current = heat;
    paintYearHeat();
  }

  async function fetchAndRebuild() {
    const ids = Object.keys(calsRef.current);
    instRef.current = await getEventsForWindow(ids, rangeRef.current.from, rangeRef.current.to);
    rebuild();
  }

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, showDone, showExpired]);

  // 切回日历 tab 时日历容器从 display:none 变可见，FC 需重算尺寸
  useEffect(() => {
    if (pane === "calendar") requestAnimationFrame(() => calRef.current?.updateSize());
  }, [pane]);

  useEffect(() => {
    if (!session || !elRef.current) return;
    let alive = true;
    (async () => {
      await ensureDefaultCalendars(session.user.id);
      const [cals, course, taskList] = await Promise.all([
        getMyCalendars(session.user.id),
        getScheduleAsRecurring(),
        getTasks(session.user.id),
      ]);
      if (!alive || !elRef.current) return;
      calsRef.current = Object.fromEntries(cals.map((c) => [c.id, c]));
      courseRef.current = course;
      setCalList(cals);
      setTasks(taskList);

      const cal = new Calendar(elRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, multiMonthPlugin],
        initialView: "timeGridWeek",
        locale: zhcn,
        firstDay: 1,
        nowIndicator: true,
        slotDuration: "00:30:00",
        snapDuration: "00:15:00",
        slotMinTime: "07:00:00",
        slotMaxTime: "22:00:00",
        expandRows: true,
        height: "auto",
        dayMaxEvents: true, // 月视图溢出 "+N"
        eventDisplay: "block", // 事件一律渲染成彩色条（含单日定时），不要"圆点+文字"
        headerToolbar: { left: "prev,next today", center: "title", right: "" },
        views: { multiMonthYear: { multiMonthMaxColumns: 3 }, dayGridMonth: { displayEventTime: false } },
        selectable: true,
        selectMirror: true,
        editable: true,
        datesSet: (info) => {
          rangeRef.current = { from: info.startStr, to: info.endStr };
          viewRef.current = info.view.type;
          setView(info.view.type);
          fetchAndRebuild();
        },
        select: (info) => {
          openCreate(info.start, info.end);
          cal.unselect();
        },
        dateClick: (info) => {
          const base = new Date(info.date);
          if (info.allDay) base.setHours(9, 0, 0, 0);
          openCreate(base, new Date(base.getTime() + 60 * 60 * 1000));
        },
        eventClick: (info) => {
          const ep = info.event.extendedProps as Record<string, unknown>;
          if (ep.isCourse) {
            if (ep.courseId) router.push(`/course?id=${ep.courseId}`);
            return;
          }
          openEdit(info.event);
        },
        eventDrop: (info) => handleMove(info),
        eventResize: (info) => handleMove(info),
        eventDidMount: (info) => {
          const ep = info.event.extendedProps as Record<string, unknown>;
          if (ep.isCourse) return;
          if (info.view.type.startsWith("list")) {
            const cell = info.el.querySelector(".fc-list-event-graphic");
            if (cell) {
              const btn = document.createElement("button");
              btn.type = "button";
              const on = ep.status === "done";
              btn.className = "hq-check" + (on ? " hq-check-on" : "");
              btn.setAttribute("aria-label", on ? "标记未完成" : "标记完成");
              btn.onclick = (ev) => {
                ev.stopPropagation();
                toggleDone(info.event);
              };
              cell.innerHTML = "";
              cell.appendChild(btn);
            }
          }
        },
        eventMouseEnter: (info) => {
          const ep = info.event.extendedProps as Record<string, unknown>;
          const loc = (ep.location as string) || "";
          const meeting = detectMeetingLink(loc || info.event.title);
          setHover({
            x: info.jsEvent.clientX,
            y: info.jsEvent.clientY,
            title: info.event.title,
            time: fmtRange(info.event.start, info.event.end, info.event.allDay),
            location: loc || null,
            meeting: meeting?.provider ?? null,
          });
        },
        eventMouseLeave: () => setHover(null),
      });
      calRef.current = cal;
      cal.render();
    })();
    return () => {
      alive = false;
      calRef.current?.destroy();
      calRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function openCreate(start: Date, end: Date) {
    setForm({
      mode: "create",
      title: "",
      start: toLocalInput(start),
      end: toLocalInput(end),
      kind: "event",
      calendarId: defaultCalId(),
      location: "",
      status: "confirmed",
      allDay: false,
      ...EMPTY_RECUR,
    });
  }

  function nlCreate() {
    if (!nlText.trim()) return;
    const r = parseNL(nlText, new Date());
    if (!r) {
      showToast("没读懂这句～换种说法，或点空白手动建。例：明天下午3点开会", null);
      return;
    }
    const rec = r.recurrence;
    setForm({
      mode: "create",
      title: r.title,
      start: toLocalInput(r.start),
      end: toLocalInput(r.end),
      kind: "event",
      calendarId: defaultCalId(),
      location: "",
      status: "confirmed",
      allDay: r.allDay,
      recurFreq: rec ? rec.freq : "none",
      recurWeekdays: rec?.byWeekday ?? [],
      recurEndMode: rec?.endMode ?? "never",
      recurUntil: rec?.until ?? "",
      recurCount: rec?.count ?? 10,
    });
    setNlText("");
  }

  async function refreshTasks() {
    if (session) setTasks(await getTasks(session.user.id));
  }
  async function addTask(title: string, dueAt: string | null) {
    if (!session) return;
    await createTask({ title, dueAt }, session.user.id);
    refreshTasks();
  }
  async function toggleTask(t: Task) {
    await updateTask(t.id, { status: t.status === "done" ? "todo" : "done" });
    refreshTasks();
  }
  async function deleteTask(t: Task) {
    await softDeleteTask(t.id);
    refreshTasks();
  }
  // 任务"安排"→ 预填创建表单（时间块），存事件后回写 link
  function scheduleTaskToForm(t: Task) {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const base = t.dueAt ? new Date(t.dueAt) : start;
    setForm({
      mode: "create",
      title: t.title,
      start: toLocalInput(base),
      end: toLocalInput(new Date(base.getTime() + 60 * 60 * 1000)),
      kind: "timeblock",
      calendarId: defaultCalId(),
      location: "",
      status: "confirmed",
      allDay: false,
      linkTaskId: t.id,
      ...EMPTY_RECUR,
    });
  }

  function openEdit(ev: { id: string; title: string; start: Date | null; end: Date | null; allDay?: boolean; extendedProps: Record<string, unknown> }) {
    const ep = ev.extendedProps;
    const start = ev.start ?? new Date();
    const startISO = start.toISOString();
    const seriesRrule = (ep.seriesRrule as string | null) ?? null;
    let recur = { ...EMPTY_RECUR } as Pick<FormState, "recurFreq" | "recurWeekdays" | "recurEndMode" | "recurUntil" | "recurCount">;
    if (ep.isRecurring && seriesRrule) {
      const r = parseRRule(seriesRrule, startISO);
      recur = {
        recurFreq: r.freq,
        recurWeekdays: r.byWeekday,
        recurEndMode: r.endMode,
        recurUntil: r.until ?? "",
        recurCount: r.count ?? 10,
      };
    }
    setForm({
      mode: "edit",
      instanceId: ev.id,
      masterId: (ep.masterId as string | null) ?? null,
      occurrenceStart: (ep.occurrenceStart as string | null) ?? null,
      isRecurring: Boolean(ep.isRecurring),
      seriesRrule,
      title: ev.title,
      start: toLocalInput(start),
      end: toLocalInput(ev.end ?? start),
      kind: (ep.kind as "event" | "timeblock") ?? "event",
      calendarId: (ep.calendarId as string) ?? defaultCalId(),
      location: (ep.location as string) ?? "",
      status: (ep.status as EventStatus) ?? "confirmed",
      allDay: ev.allDay ?? false,
      ...recur,
    });
  }

  async function toggleDone(ev: { id: string; title: string; start: Date | null; end: Date | null; extendedProps: Record<string, unknown> }) {
    const ep = ev.extendedProps;
    const next = ep.status === "done" ? "confirmed" : "done";
    if (ep.isRecurring) {
      await updateOccurrence(
        ep.masterId as string,
        ep.occurrenceStart as string,
        {
          calendarId: ep.calendarId as string,
          title: ev.title,
          startsAt: (ev.start ?? new Date()).toISOString(),
          endsAt: (ev.end ?? ev.start ?? new Date()).toISOString(),
          kind: ep.kind as "event" | "timeblock",
          location: (ep.location as string) ?? null,
          status: next,
        },
        session!.user.id,
      );
    } else {
      await updateEvent(ev.id, { status: next });
    }
    fetchAndRebuild();
  }

  async function handleMove(info: {
    event: { id: string; title: string; start: Date | null; end: Date | null; extendedProps: Record<string, unknown> };
    oldEvent: { start: Date | null; end: Date | null };
    revert: () => void;
  }) {
    const ep = info.event.extendedProps;
    const start = info.event.start ?? new Date();
    const end = info.event.end ?? start;
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    if (!ep.isRecurring) {
      const res = await updateEventTime(info.event.id, startISO, endISO);
      if ("error" in res) {
        info.revert();
        showToast(res.error, null);
        return;
      }
      const e = instRef.current.find((x) => x.instanceId === info.event.id);
      if (e) {
        e.startsAt = startISO;
        e.endsAt = endISO;
      }
      const oStart = (info.oldEvent.start ?? start).toISOString();
      const oEnd = (info.oldEvent.end ?? end).toISOString();
      const conflict = overlaps(startISO, endISO, info.event.id);
      showToast(conflict ? "已移动 · 与其它日程时间重叠" : "已移动", async () => {
        await updateEventTime(info.event.id, oStart, oEnd);
        fetchAndRebuild();
      });
      return;
    }

    // 重复实例：问作用范围
    const masterId = ep.masterId as string;
    const occ = ep.occurrenceStart as string;
    const seriesRrule = (ep.seriesRrule as string | null) ?? null;
    const calendarId = ep.calendarId as string;
    setScopeAsk({
      mode: "edit",
      onCancel: () => info.revert(),
      run: async (scope) => {
        if (scope === "this") {
          await updateOccurrence(
            masterId,
            occ,
            {
              calendarId,
              title: info.event.title,
              startsAt: startISO,
              endsAt: endISO,
              kind: ep.kind as "event" | "timeblock",
              location: (ep.location as string) ?? null,
              status: ep.status as "draft" | "confirmed" | "done" | "cancelled",
            },
            session!.user.id,
          );
        } else if (scope === "thisAndFuture") {
          await splitSeries(
            masterId,
            occ,
            {
              title: info.event.title,
              startsAt: startISO,
              endsAt: endISO,
              kind: ep.kind as "event" | "timeblock",
              location: (ep.location as string) ?? null,
              recurrence: reanchor(seriesRrule, startISO),
            },
            { calendarId, userId: session!.user.id },
          );
        } else {
          // 整个系列：按 delta 平移母事件
          const master = await getEvent(masterId);
          if (master) {
            const deltaMs = new Date(startISO).getTime() - new Date(occ).getTime();
            const durMs = new Date(endISO).getTime() - new Date(startISO).getTime();
            const newStart = new Date(new Date(master.startsAt).getTime() + deltaMs).toISOString();
            const newEnd = new Date(new Date(newStart).getTime() + durMs).toISOString();
            await updateSeries(masterId, {
              startsAt: newStart,
              endsAt: newEnd,
              recurrence: reanchor(master.rrule, newStart),
            });
          }
        }
        setScopeAsk(null);
        fetchAndRebuild();
      },
    });
  }

  async function submitForm() {
    if (!form || !session || !form.title.trim() || !form.calendarId) return;
    const startISO = new Date(form.start).toISOString();
    const endISO = new Date(form.end).toISOString();
    const recurrence = formToRecurrence(form, startISO);
    const uid = session.user.id;

    if (form.mode === "create") {
      const res = await createEvent(
        {
          calendarId: form.calendarId,
          title: form.title.trim(),
          startsAt: startISO,
          endsAt: endISO,
          kind: form.kind,
          location: form.location || null,
          status: form.status,
          allDay: form.allDay,
          recurrence,
        },
        uid,
      );
      if ("error" in res) {
        showToast(res.error, null);
        return;
      }
      let linkErr: string | null = null;
      if (form.linkTaskId) {
        const lr = await scheduleTask(form.linkTaskId, res.id, uid);
        if ("error" in lr) linkErr = lr.error;
        else refreshTasks();
      }
      setForm(null);
      await fetchAndRebuild();
      showToast(
        form.linkTaskId
          ? linkErr
            ? "事件已建，但关联任务失败：" + linkErr
            : "已安排到日历"
          : recurrence
            ? "已新建重复日程"
            : overlaps(startISO, endISO)
              ? "已新建 · 与其它日程重叠"
              : "已新建",
        null,
      );
      return;
    }

    // edit
    if (!form.isRecurring) {
      if (recurrence) {
        await updateSeries(form.instanceId!, {
          title: form.title.trim(),
          startsAt: startISO,
          endsAt: endISO,
          kind: form.kind,
          location: form.location || null,
          status: form.status,
          allDay: form.allDay,
          recurrence,
        });
      } else {
        await updateEvent(form.instanceId!, {
          title: form.title.trim(),
          startsAt: startISO,
          endsAt: endISO,
          kind: form.kind,
          location: form.location || null,
          status: form.status,
          allDay: form.allDay,
        });
      }
      setForm(null);
      fetchAndRebuild();
      return;
    }

    // 编辑重复实例 → 问作用范围
    const masterId = form.masterId!;
    const occ = form.occurrenceStart!;
    const calendarId = form.calendarId;
    const title = form.title.trim();
    const kind = form.kind;
    const location = form.location || null;
    const status = form.status;
    setScopeAsk({
      mode: "edit",
      onCancel: () => {},
      run: async (scope) => {
        if (scope === "this") {
          await updateOccurrence(masterId, occ, { calendarId, title, startsAt: startISO, endsAt: endISO, kind, location, status, allDay: form.allDay }, uid);
        } else if (scope === "thisAndFuture") {
          await splitSeries(
            masterId,
            occ,
            { title, startsAt: startISO, endsAt: endISO, kind, location, status, recurrence: recurrence ?? reanchor(form.seriesRrule ?? null, startISO) },
            { calendarId, userId: uid },
          );
        } else {
          const master = await getEvent(masterId);
          if (master) {
            const deltaMs = new Date(startISO).getTime() - new Date(occ).getTime();
            const durMs = new Date(endISO).getTime() - new Date(startISO).getTime();
            const newStart = new Date(new Date(master.startsAt).getTime() + deltaMs).toISOString();
            const newEnd = new Date(new Date(newStart).getTime() + durMs).toISOString();
            await updateSeries(masterId, {
              title,
              startsAt: newStart,
              endsAt: newEnd,
              kind,
              location,
              status,
              allDay: form.allDay,
              recurrence: recurrence ?? reanchor(master.rrule, newStart),
            });
          }
        }
        setForm(null);
        setScopeAsk(null);
        fetchAndRebuild();
      },
    });
  }

  async function removeEvent() {
    if (!form?.instanceId || !session) return;
    if (!form.isRecurring) {
      await softDeleteEvent(form.instanceId);
      setForm(null);
      fetchAndRebuild();
      return;
    }
    const masterId = form.masterId!;
    const occ = form.occurrenceStart!;
    const startISO = new Date(form.start).toISOString();
    const endISO = new Date(form.end).toISOString();
    setScopeAsk({
      mode: "delete",
      onCancel: () => {},
      run: async (scope) => {
        if (scope === "this") {
          await cancelOccurrence(masterId, occ, { calendarId: form.calendarId, title: form.title, startsAt: startISO, endsAt: endISO }, session.user.id);
        } else if (scope === "thisAndFuture") {
          await truncateSeries(masterId, occ);
        } else {
          await deleteSeries(masterId);
        }
        setForm(null);
        setScopeAsk(null);
        fetchAndRebuild();
      },
    });
  }

  function switchView(key: string) {
    calRef.current?.changeView(key);
  }

  function toggleWeekday(n: number) {
    if (!form) return;
    const has = form.recurWeekdays.includes(n);
    setForm({ ...form, recurWeekdays: has ? form.recurWeekdays.filter((x) => x !== n) : [...form.recurWeekdays, n] });
  }

  const recurPreview = (() => {
    if (!form || form.recurFreq === "none") return "";
    const startISO = form.start ? new Date(form.start).toISOString() : new Date().toISOString();
    const rec = formToRecurrence(form, startISO);
    return rec ? describeRRule(buildRRule(rec, startISO), startISO) : "";
  })();

  const formMeeting = form ? detectMeetingLink(form.location || form.title) : null;
  const detailHref =
    form && form.mode === "edit"
      ? `/event?id=${form.isRecurring ? form.masterId : form.instanceId}${
          form.isRecurring && form.occurrenceStart ? `&occ=${encodeURIComponent(form.occurrenceStart)}` : ""
        }`
      : null;

  const todoCount = tasks.filter((t) => t.status === "todo" && !t.scheduledEventId).length;

  if (!session) return null;

  return (
    <section className={s.view}>
      <div className={s.head}>
        <p className={s.eyebrow}>我的一周 · MY WEEK</p>
        <div className={s.tabBar} role="tablist" aria-label="日历 / 任务">
          <button
            type="button"
            role="tab"
            aria-selected={pane === "calendar"}
            className={`${s.tab} ${pane === "calendar" ? s.tabOn : ""}`}
            onClick={() => setPane("calendar")}
          >
            日历
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pane === "tasks"}
            className={`${s.tab} ${pane === "tasks" ? s.tabOn : ""}`}
            onClick={() => setPane("tasks")}
          >
            任务{todoCount > 0 && <span className={s.tabBadge}>{todoCount}</span>}
          </button>
        </div>
      </div>

      {/* 日历面板（始终挂载，切到任务时仅隐藏，保住 FullCalendar 实例） */}
      <div style={{ display: pane === "calendar" ? undefined : "none" }}>
        <div className={s.controls}>
          <div className={s.legend}>
            {(["course", "personal", "work"] as const).map((k) => (
              <label key={k} className={s.legendItem}>
                <input type="checkbox" checked={layers[k]} onChange={(e) => setLayers((p) => ({ ...p, [k]: e.target.checked }))} />
                <span className={`${s.dot} ${s["dot_" + k]}`} />
                {k === "course" ? "课表" : k === "personal" ? "私人" : "工作"}
              </label>
            ))}
          </div>
          <div className={s.toggles}>
            <label className={s.legendItem}>
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> 显示已完成
            </label>
            <label className={s.legendItem}>
              <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> 显示已过期
            </label>
          </div>
        </div>

        <div className={s.nlBar}>
          <span className={s.nlSpark} aria-hidden="true">
            ✨
          </span>
          <input
            className={s.nlInput}
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") nlCreate();
            }}
            placeholder="用一句话建日程：明天下午3点开会 / 每周三晚7点排练 / 6月30号下午2点答辩"
            aria-label="用一句话建日程"
          />
          <button type="button" className={s.nlBtn} onClick={nlCreate}>
            建
          </button>
        </div>

        <div ref={elRef} className={s.cal} />

        <div className={s.pills} role="tablist" aria-label="视图切换">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              className={`${s.pill} ${view === v.key ? s.pillOn : ""}`}
              onClick={() => switchView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {pane === "tasks" && (
        <TasksPanel tasks={tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} onSchedule={scheduleTaskToForm} />
      )}

      {toast && (
        <div className={s.toast}>
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              撤销
            </button>
          )}
        </div>
      )}

      {hover && (
        <div className={s.hoverCard} style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <strong>{hover.title}</strong>
          <span className={s.hoverTime}>{hover.time}</span>
          {hover.location && <span className={s.hoverMeta}>地点 · {hover.location}</span>}
          {hover.meeting && <span className={s.hoverMeet}>会议 · {hover.meeting}</span>}
        </div>
      )}

      {scopeAsk && (
        <div
          className={s.modalBack}
          onClick={() => {
            scopeAsk.onCancel();
            setScopeAsk(null);
          }}
        >
          <div className={`${s.modal} ${s.scopeModal}`} onClick={(e) => e.stopPropagation()}>
            <h2>这是一个重复日程</h2>
            <p className={s.scopeHint}>{scopeAsk.mode === "delete" ? "要删除哪些？" : "改动应用到哪些？"}</p>
            <div className={s.scopeBtns}>
              <button type="button" onClick={() => scopeAsk.run("this")}>
                仅此次
              </button>
              <button type="button" onClick={() => scopeAsk.run("thisAndFuture")}>
                此次及以后
              </button>
              <button type="button" onClick={() => scopeAsk.run("all")}>
                整个系列
              </button>
            </div>
            <button
              type="button"
              className={s.cancel}
              onClick={() => {
                scopeAsk.onCancel();
                setScopeAsk(null);
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {form && (
        <div className={s.modalBack} onClick={() => setForm(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{form.mode === "create" ? "新建日程" : "编辑日程"}</h2>
            <label className={s.field}>
              标题
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </label>
            <div className={s.row}>
              <label className={s.field}>
                开始
                <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </label>
              <label className={s.field}>
                结束
                <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </label>
            </div>
            <div className={s.row}>
              <label className={s.field}>
                类型
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "event" | "timeblock" })}>
                  <option value="event">真实事件</option>
                  <option value="timeblock">计划时间块</option>
                </select>
              </label>
              <label className={s.field}>
                日历
                <select value={form.calendarId} onChange={(e) => setForm({ ...form, calendarId: e.target.value })}>
                  {calList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={s.field}>
              状态
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
                <option value="confirmed">已确认</option>
                <option value="draft">草稿</option>
                <option value="done">已完成</option>
              </select>
            </label>
            <label className={s.checkRow}>
              <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} /> 全天
            </label>
            <label className={s.field}>
              地点
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="可空（贴会议链接会自动识别）" />
            </label>
            {formMeeting && (
              <a className={s.joinBtn} href={formMeeting.url} target="_blank" rel="noopener noreferrer">
                进入会议 · {formMeeting.provider} ↗
              </a>
            )}

            <div className={s.recurBox}>
              <label className={s.field}>
                重复
                <select value={form.recurFreq} onChange={(e) => setForm({ ...form, recurFreq: e.target.value as RecurField })}>
                  <option value="none">不重复</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月（按号）</option>
                  <option value="yearly">每年</option>
                </select>
              </label>
              {form.recurFreq === "weekly" && (
                <div className={s.weekdays}>
                  {WD_CN.map((w, n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${s.wd} ${form.recurWeekdays.includes(n) ? s.wdOn : ""}`}
                      onClick={() => toggleWeekday(n)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              )}
              {form.recurFreq !== "none" && (
                <div className={s.row}>
                  <label className={s.field}>
                    结束
                    <select value={form.recurEndMode} onChange={(e) => setForm({ ...form, recurEndMode: e.target.value as FormState["recurEndMode"] })}>
                      <option value="never">永不</option>
                      <option value="until">到某天</option>
                      <option value="count">重复 N 次</option>
                    </select>
                  </label>
                  {form.recurEndMode === "until" && (
                    <label className={s.field}>
                      截止日
                      <input type="date" value={form.recurUntil} onChange={(e) => setForm({ ...form, recurUntil: e.target.value })} />
                    </label>
                  )}
                  {form.recurEndMode === "count" && (
                    <label className={s.field}>
                      次数
                      <input
                        type="number"
                        min={1}
                        value={form.recurCount}
                        onChange={(e) => setForm({ ...form, recurCount: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </label>
                  )}
                </div>
              )}
              {recurPreview && <p className={s.recurPreview}>↻ {recurPreview}</p>}
            </div>

            <div className={s.modalActions}>
              {form.mode === "edit" && (
                <button type="button" className={s.del} onClick={removeEvent}>
                  删除
                </button>
              )}
              {detailHref && (
                <button type="button" className={s.detailLink} onClick={() => router.push(detailHref)}>
                  详情 ↗
                </button>
              )}
              <span style={{ flex: 1 }} />
              <button type="button" className={s.cancel} onClick={() => setForm(null)}>
                取消
              </button>
              <button type="button" className={s.save} onClick={submitForm} disabled={!form.title.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
