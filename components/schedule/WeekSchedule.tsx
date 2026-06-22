"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./Schedule.module.css";
import { getWeekSchedule } from "@/lib/data";
import type { WeekSlot } from "@/lib/types";

const NAMES = ["周一", "周二", "周三", "周四", "周五"];
const HOUR = 54; // 每小时像素高
const PAD = 10; // 顶部留白
const EVT: Record<string, string> = {
  yellow: s.evtYellow,
  coral: s.evtCoral,
  blue: s.evtBlue,
  mint: s.evtMint,
  pink: s.evtPink,
};
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad2 = (n: number) => String(n).padStart(2, "0");

export default function WeekSchedule() {
  const [slots, setSlots] = useState<WeekSlot[] | null>(null);
  const [today, setToday] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getWeekSchedule()
      .then(({ slots, weekdayToday }) => {
        if (active) {
          setSlots(slots);
          setToday(weekdayToday);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dateLabel = (wd: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + (wd - 1));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  let startHour = 8;
  let endHour = 21;
  if (slots && slots.length) {
    const mins = slots.flatMap((x) => [toMin(x.startsAt), toMin(x.endsAt)]);
    startHour = Math.floor(Math.min(...mins) / 60);
    endHour = Math.ceil(Math.max(...mins) / 60);
  }
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const topOf = (min: number) => ((min - startHour * 60) / 60) * HOUR + PAD;
  const totalH = (endHour - startHour) * HOUR + PAD * 2;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = today >= 1 && today <= 5 && nowMin >= startHour * 60 && nowMin <= endHour * 60;

  return (
    <section className={s.view}>
      <div className={s.head}>
        <p className={s.eyebrow}>MY WEEK / 我的一周</p>
        <h1>
          把时间切成<i> 舒服的样子。</i>
        </h1>
        <p className={s.note}>
          好奇这学期的官方课表（公共事实，不能改）。红线是此刻，今天整列高亮，临时调课标红。个人并行视图随后再做。
        </p>
      </div>

      {error && <div className={s.state}>课表没加载出来，刷新试试。</div>}
      {!error && !slots && <div className={s.state}>正在加载课表…</div>}

      {!error && slots && (
        <div className={s.cal}>
          <div className={s.calHead}>
            <div className={s.corner} />
            {[1, 2, 3, 4, 5].map((wd) => (
              <div key={wd} className={`${s.dayHead} ${wd === today ? s.todayHead : ""}`}>
                <span className={s.dn}>{NAMES[wd - 1]}</span>
                <span className={`${s.dd} ${wd === today ? s.ddToday : ""}`}>{dateLabel(wd)}</span>
              </div>
            ))}
          </div>

          <div className={s.calBody}>
            <div className={s.gutter} style={{ height: totalH }}>
              {hours.map((h) => (
                <div key={h} className={s.hourLabel} style={{ top: (h - startHour) * HOUR + PAD }}>
                  {pad2(h)}:00
                </div>
              ))}
            </div>

            <div className={s.days} style={{ height: totalH }}>
              {hours.map((h) => (
                <div key={h} className={s.hourLine} style={{ top: (h - startHour) * HOUR + PAD }} />
              ))}
              <div className={s.daysGrid}>
                {[1, 2, 3, 4, 5].map((wd) => (
                  <div key={wd} className={`${s.dayCol} ${wd === today ? s.todayCol : ""}`}>
                    {slots
                      .filter((x) => x.weekday === wd)
                      .map((sl) => {
                        const t = topOf(toMin(sl.startsAt));
                        const ht = Math.max(topOf(toMin(sl.endsAt)) - t, 38);
                        const klass = `${s.event} ${sl.avatarColor ? EVT[sl.avatarColor] : s.evtNone} ${
                          sl.hasChangeToday ? s.changed : ""
                        }`;
                        const inner = (
                          <>
                            <span className={s.evtTime}>
                              {sl.startsAt}–{sl.endsAt}
                            </span>
                            <span className={s.evtTitle}>{sl.title}</span>
                            {sl.hasChangeToday && <span className={s.evtChange}>{sl.changeNote}</span>}
                          </>
                        );
                        return sl.courseId ? (
                          <Link
                            key={sl.slotId}
                            href={`/course?id=${sl.courseId}`}
                            className={klass}
                            style={{ top: t, height: ht }}
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div key={sl.slotId} className={klass} style={{ top: t, height: ht }}>
                            {inner}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
              {showNow && (
                <div className={s.nowLine} style={{ top: topOf(nowMin) }}>
                  <span className={s.nowDot} style={{ left: `calc(${today - 1} * 20%)` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
