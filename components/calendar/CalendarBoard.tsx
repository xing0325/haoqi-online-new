"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, type EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import zhcn from "@fullcalendar/core/locales/zh-cn";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createEvent,
  ensureDefaultCalendars,
  getEventsInRange,
  getMyCalendars,
  getScheduleAsRecurring,
  softDeleteEvent,
  updateEvent,
  updateEventTime,
} from "@/lib/data";
import type { CalEvent, Calendar as Cal, ScheduleRecurring } from "@/lib/types";
import s from "./Calendar.module.css";
import "./calendar-theme.css";

type FormState = {
  mode: "create" | "edit";
  id?: string;
  title: string;
  start: string; // datetime-local 值
  end: string;
  kind: "event" | "timeblock";
  calendarId: string;
  location: string;
};

// Date → datetime-local 字符串（本地时区）
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 颜色 → 浅底（纸感：浅底 + 色边 + 深色文字，始终可读）
const TINT: Record<string, string> = {
  "#e6c000": "#fff6c9",
  "#ef785e": "#ffe6df",
  "#5b9be0": "#e4f0fe",
  "#4cb88a": "#dcf3e6",
  "#ef8aa0": "#ffe1e7",
  "#aeb6c2": "#eef0f3",
};

export default function CalendarBoard() {
  const { session } = useAuth();
  const router = useRouter();
  const elRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<Calendar | null>(null);
  const calsRef = useRef<Record<string, Cal>>({});
  const courseRef = useRef<ScheduleRecurring[]>([]);
  const eventsRef = useRef<CalEvent[]>([]);
  const rangeRef = useRef<{ from: string; to: string }>({ from: "", to: "" });

  const [calList, setCalList] = useState<Cal[]>([]);
  const [layers, setLayers] = useState({ course: true, personal: true, work: true });
  const [showDone, setShowDone] = useState(false);
  const [showExpired, setShowExpired] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: (() => void) | null } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function overlaps(startISO: string, endISO: string, excludeId?: string): boolean {
    const a = new Date(startISO).getTime();
    const b = new Date(endISO).getTime();
    return eventsRef.current.some((e) => {
      if (e.id === excludeId) return false;
      const x = new Date(e.startsAt).getTime();
      const y = new Date(e.endsAt).getTime();
      return a < y && b > x;
    });
  }

  function rebuild() {
    const cal = calRef.current;
    if (!cal) return;
    cal.removeAllEvents();
    if (layersRef.current.course) {
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
    for (const e of eventsRef.current) {
      const meta = calsRef.current[e.calendarId];
      if (!meta) continue;
      if (meta.kind === "personal" && !layersRef.current.personal) continue;
      if (meta.kind === "work" && !layersRef.current.work) continue;
      if (e.status === "done" && !doneRef.current) continue;
      if (new Date(e.endsAt).getTime() < now && !expRef.current) continue;
      const cls: string[] = [];
      if (e.kind === "timeblock") cls.push("fc-tb");
      if (e.status === "done") cls.push("fc-done");
      if (e.status === "draft") cls.push("fc-draft");
      cal.addEvent({
        id: e.id,
        title: e.title,
        start: e.startsAt,
        end: e.endsAt,
        allDay: e.allDay,
        editable: true,
        backgroundColor: TINT[meta.color ?? ""] ?? "#e4f0fe",
        borderColor: meta.color ?? "#5b9be0",
        textColor: "#18243b",
        classNames: cls,
        extendedProps: { calendarId: e.calendarId, kind: e.kind, status: e.status, location: e.location },
      });
    }
  }

  async function fetchAndRebuild() {
    const ids = Object.keys(calsRef.current);
    eventsRef.current = await getEventsInRange(ids, rangeRef.current.from, rangeRef.current.to);
    rebuild();
  }

  useEffect(() => {
    rebuild();
  }, [layers, showDone, showExpired]);

  useEffect(() => {
    if (!session || !elRef.current) return;
    let alive = true;
    (async () => {
      await ensureDefaultCalendars(session.user.id);
      const [cals, course] = await Promise.all([getMyCalendars(session.user.id), getScheduleAsRecurring()]);
      if (!alive || !elRef.current) return;
      calsRef.current = Object.fromEntries(cals.map((c) => [c.id, c]));
      courseRef.current = course;
      setCalList(cals);

      const cal = new Calendar(elRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
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
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        selectable: true,
        selectMirror: true,
        editable: true,
        datesSet: (info) => {
          rangeRef.current = { from: info.startStr, to: info.endStr };
          fetchAndRebuild();
        },
        select: (info) => {
          const personal = calList.find((c) => c.kind === "personal") ?? cals.find((c) => c.kind === "personal");
          setForm({
            mode: "create",
            title: "",
            start: toLocalInput(info.start),
            end: toLocalInput(info.end),
            kind: "event",
            calendarId: personal?.id ?? cals[0]?.id ?? "",
            location: "",
          });
          cal.unselect();
        },
        eventClick: (info) => {
          const ep = info.event.extendedProps as Record<string, unknown>;
          if (ep.isCourse) {
            if (ep.courseId) router.push(`/course?id=${ep.courseId}`);
            return;
          }
          setForm({
            mode: "edit",
            id: info.event.id,
            title: info.event.title,
            start: toLocalInput(info.event.start ?? new Date()),
            end: toLocalInput(info.event.end ?? info.event.start ?? new Date()),
            kind: (ep.kind as "event" | "timeblock") ?? "event",
            calendarId: (ep.calendarId as string) ?? "",
            location: (ep.location as string) ?? "",
          });
        },
        eventDrop: (info) => handleMove(info),
        eventResize: (info) => handleMove(info),
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

  async function handleMove(info: {
    event: { id: string; start: Date | null; end: Date | null };
    oldEvent: { start: Date | null; end: Date | null };
    revert: () => void;
  }) {
    const id = info.event.id;
    const start = info.event.start ?? new Date();
    const end = info.event.end ?? start;
    const res = await updateEventTime(id, start.toISOString(), end.toISOString());
    if ("error" in res) {
      info.revert();
      showToast(res.error, null);
      return;
    }
    const e = eventsRef.current.find((x) => x.id === id);
    if (e) {
      e.startsAt = start.toISOString();
      e.endsAt = end.toISOString();
    }
    const oStart = info.oldEvent.start ?? start;
    const oEnd = info.oldEvent.end ?? end;
    const conflict = overlaps(start.toISOString(), end.toISOString(), id);
    showToast(conflict ? "已移动 · 与其它日程时间重叠" : "已移动", async () => {
      await updateEventTime(id, oStart.toISOString(), oEnd.toISOString());
      if (e) {
        e.startsAt = oStart.toISOString();
        e.endsAt = oEnd.toISOString();
      }
      rebuild();
    });
  }

  async function submitForm() {
    if (!form || !session || !form.title.trim() || !form.calendarId) return;
    const startISO = new Date(form.start).toISOString();
    const endISO = new Date(form.end).toISOString();
    if (form.mode === "create") {
      const res = await createEvent(
        { calendarId: form.calendarId, title: form.title.trim(), startsAt: startISO, endsAt: endISO, kind: form.kind, location: form.location || null },
        session.user.id,
      );
      if ("error" in res) {
        showToast(res.error, null);
        return;
      }
      eventsRef.current.push(res);
      setForm(null);
      rebuild();
      const newId = res.id;
      showToast(overlaps(startISO, endISO, newId) ? "已新建 · 与其它日程重叠" : "已新建", async () => {
        await softDeleteEvent(newId);
        eventsRef.current = eventsRef.current.filter((x) => x.id !== newId);
        rebuild();
      });
    } else if (form.id) {
      const res = await updateEvent(form.id, {
        title: form.title.trim(),
        startsAt: startISO,
        endsAt: endISO,
        kind: form.kind,
        location: form.location || null,
      });
      if ("error" in res) {
        showToast(res.error, null);
        return;
      }
      const e = eventsRef.current.find((x) => x.id === form.id);
      if (e) {
        e.title = form.title.trim();
        e.startsAt = startISO;
        e.endsAt = endISO;
        e.kind = form.kind;
        e.location = form.location || null;
      }
      setForm(null);
      rebuild();
    }
  }

  async function deleteEvent() {
    if (!form?.id) return;
    await softDeleteEvent(form.id);
    eventsRef.current = eventsRef.current.filter((x) => x.id !== form.id);
    setForm(null);
    rebuild();
  }

  if (!session) return null;

  return (
    <section className={s.view}>
      <div className={s.head}>
        <p className={s.eyebrow}>MY WEEK / 我的一周</p>
        <h1>
          把时间切成<i> 舒服的样子。</i>
        </h1>
      </div>

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

      <p className={s.hint}>课表只读（拖不动）。点空白新建，双击改，拖动改时间、拉伸改时长（15 分钟吸附）。</p>

      <div ref={elRef} className={s.cal} />

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
              地点
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="可空" />
            </label>
            <div className={s.modalActions}>
              {form.mode === "edit" && (
                <button type="button" className={s.del} onClick={deleteEvent}>
                  删除
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
