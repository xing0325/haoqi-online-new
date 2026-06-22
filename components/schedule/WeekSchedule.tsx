"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./Schedule.module.css";
import { getWeekSchedule } from "@/lib/data";
import type { WeekSlot } from "@/lib/types";

const NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TINT: Record<string, string> = {
  yellow: s.cYellow,
  coral: s.cCoral,
  blue: s.cBlue,
  mint: s.cMint,
  pink: s.cPink,
};

export default function WeekSchedule() {
  const [slots, setSlots] = useState<WeekSlot[] | null>(null);
  const [today, setToday] = useState(1);
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

  return (
    <section className={s.view}>
      <div className={s.head}>
        <p className={s.eyebrow}>MY WEEK / 我的一周</p>
        <h1>
          把时间切成<i> 舒服的样子。</i>
        </h1>
        <p className={s.note}>
          这是好奇这学期的官方课表（公共事实，不能改）。今天{NAMES[today - 1]}已高亮，临时调课会标红。个人并行视图随后再做。
        </p>
      </div>

      {error && <div className={s.state}>课表没加载出来，刷新试试。</div>}
      {!error && !slots && <div className={s.state}>正在加载课表…</div>}

      {!error && slots && (
        <div className={s.week}>
          {[1, 2, 3, 4, 5].map((wd) => {
            const dayslots = slots
              .filter((x) => x.weekday === wd)
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            return (
              <div key={wd} className={`${s.day} ${wd === today ? s.today : ""}`}>
                <div className={s.dayHead}>
                  <b>{NAMES[wd - 1]}</b>
                  {wd === today && <span className={s.todayTag}>今天</span>}
                </div>
                {dayslots.length === 0 && <p className={s.empty}>—</p>}
                {dayslots.map((sl) => {
                  const tint = sl.avatarColor ? TINT[sl.avatarColor] : s.cNone;
                  const inner = (
                    <>
                      <time>
                        {sl.startsAt}–{sl.endsAt}
                      </time>
                      <h4>{sl.title}</h4>
                      {sl.hasChangeToday && <span className={s.slotChange}>{sl.changeNote}</span>}
                    </>
                  );
                  return sl.courseId ? (
                    <Link key={sl.slotId} href={`/course?id=${sl.courseId}`} className={`${s.slot} ${tint}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={sl.slotId} className={`${s.slot} ${tint}`}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
