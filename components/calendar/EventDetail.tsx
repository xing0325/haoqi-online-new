"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getEvent, getMyCalendars } from "@/lib/data";
import { describeRRule } from "@/lib/recurrence";
import { detectMeetingLink } from "@/lib/meeting";
import type { CalEvent, Calendar } from "@/lib/types";
import s from "./EventDetail.module.css";

function fmtFull(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function hm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function EventDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const occ = params.get("occ");
  const { session } = useAuth();
  const [ev, setEv] = useState<CalEvent | null>(null);
  const [cal, setCal] = useState<Calendar | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setNotFound(true);
      return;
    }
    if (!session) return; // 等鉴权
    (async () => {
      const e = await getEvent(id);
      if (!active) return;
      if (!e) {
        setNotFound(true);
        return;
      }
      setEv(e);
      const cals = await getMyCalendars(session.user.id);
      if (active) setCal(cals.find((c) => c.id === e.calendarId) ?? null);
    })().catch(() => {
      if (active) setNotFound(true);
    });
    return () => {
      active = false;
    };
  }, [id, session]);

  const meeting = ev ? detectMeetingLink(ev.location || ev.title) : null;
  let timeStr = "";
  if (ev) {
    if (occ) {
      const durMs = new Date(ev.endsAt).getTime() - new Date(ev.startsAt).getTime();
      timeStr = `${fmtFull(occ)} – ${hm(new Date(new Date(occ).getTime() + durMs).toISOString())}`;
    } else {
      timeStr = `${fmtFull(ev.startsAt)} – ${hm(ev.endsAt)}`;
    }
  }

  return (
    <section className={s.view}>
      <Link href="/schedule" className={s.back}>
        ← 我的一周
      </Link>
      {notFound && (
        <div className={s.state}>
          没找到这个日程。<Link href="/schedule">回日历</Link>
        </div>
      )}
      {!notFound && !ev && <div className={s.state}>正在加载…</div>}
      {ev && (
        <article className={s.card}>
          <p className={s.kind}>
            {ev.kind === "timeblock" ? "计划时间块" : "活动"}
            {ev.rrule ? " · 重复" : ""}
          </p>
          <h1 className={s.title}>{ev.title}</h1>
          {occ && <p className={s.occNote}>这是重复系列的某一次</p>}
          <dl className={s.meta}>
            <div>
              <dt>时间</dt>
              <dd>{timeStr}</dd>
            </div>
            {ev.rrule && (
              <div>
                <dt>重复</dt>
                <dd>{describeRRule(ev.rrule, ev.startsAt)}</dd>
              </div>
            )}
            {ev.location && (
              <div>
                <dt>地点</dt>
                <dd>{ev.location}</dd>
              </div>
            )}
            {cal && (
              <div>
                <dt>日历</dt>
                <dd>
                  <span className={s.dot} style={{ background: cal.color ?? "#5b9be0" }} />
                  {cal.name}
                </dd>
              </div>
            )}
          </dl>
          {meeting && (
            <a className={s.join} href={meeting.url} target="_blank" rel="noopener noreferrer">
              进入会议 · {meeting.provider} ↗
            </a>
          )}
          <div className={s.placeholders}>
            <div className={s.ph}>
              附件（海报 / 脚本 / 材料清单）<span>建设中</span>
            </div>
            <div className={s.ph}>
              关联做事课空间<span>建设中</span>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
