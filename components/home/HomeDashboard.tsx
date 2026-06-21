"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./Home.module.css";
import {
  getCourseFeed,
  getCourses,
  getMyScore,
  getPulse,
  getReadingSummary,
  getTodaySchedule,
} from "@/lib/data";
import type {
  Course,
  FeedPost,
  PulseItem,
  ReadingSummary,
  ScheduleEntry,
  ScoreSummary,
} from "@/lib/types";

type Data = {
  schedule: ScheduleEntry[];
  feed: FeedPost[];
  courses: Course[];
  pulse: PulseItem[];
  score: ScoreSummary;
  reading: ReadingSummary;
};

export default function HomeDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.all([
      getTodaySchedule(),
      getCourseFeed(),
      getCourses(),
      getPulse(),
      getMyScore(),
      getReadingSummary(),
    ])
      .then(([schedule, feed, courses, pulse, score, reading]) => {
        if (active) setData({ schedule, feed, courses, pulse, score, reading });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const change = data?.schedule.find((e) => e.change)?.change;
  const feedCourses = data
    ? data.courses.filter((c) => data.feed.some((p) => p.course.id === c.id))
    : [];
  const filteredFeed = data
    ? filter === "all"
      ? data.feed
      : data.feed.filter((p) => p.course.id === filter)
    : [];

  return (
    <section className={s.view}>
      <div className={s.hero}>
        <div>
          <p className={s.eyebrow}>
            <span className={s.liveDot} aria-hidden="true" /> 2026 / 春季 · 第 8 周
          </p>
          <h1>
            星期三，
            <br />
            <i>慢一点</i>也没关系。
          </h1>
          <p className={s.heroCopy}>
            今天有 4 节课、几件正在长出来的事，以及一整个下午可以变得很奇怪。
          </p>
        </div>
      </div>

      {error && <div className={s.state}>有点东西没加载出来，刷新试试。</div>}
      {!error && !data && <LoadingGrid />}

      {!error && data && (
        <>
          {change && !bannerDismissed && (
            <div className={s.notice}>
              <span className={s.noticeSign} aria-hidden="true">
                !
              </span>
              <p>
                <strong>课表有一点变化：</strong>
                {change.message}
              </p>
              <button
                type="button"
                className={s.textButton}
                onClick={() => setBannerDismissed(true)}
              >
                知道了
              </button>
            </div>
          )}

          <div className={s.grid}>
            <section className={s.panel}>
              <div className={s.heading}>
                <div>
                  <p className={s.overline}>WED / 今天</p>
                  <h2>今天的切片</h2>
                </div>
                <Link className={s.linkButton} href="/schedule">
                  查看周表 <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className={s.timeline}>
                {data.schedule.map((e) => (
                  <ClassRow key={e.slotId} e={e} />
                ))}
              </div>
            </section>

            <section className={`${s.panel} ${s.pulseCard}`}>
              <div className={`${s.heading} ${s.compact}`}>
                <div>
                  <p className={s.overline}>PULSE</p>
                  <h2>大家正在</h2>
                </div>
              </div>
              {data.pulse.length > 0 ? (
                <div className={s.pulseList}>
                  {data.pulse.map((p) => (
                    <div key={p.id} className={s.pulseItem}>
                      <span className={`avatar avatar-${p.user.avatarColor}`}>{p.user.initial}</span>
                      <p>
                        <b>{p.user.displayName}</b> {p.verb}
                        <br />
                        <strong>{p.what}</strong>
                      </p>
                      <time>{p.timeLabel}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={s.placeholder}>「大家在干嘛」还在路上——做好了这里会显示同学们正在干什么。</p>
              )}
              <button className={s.statusButton} type="button" disabled title="更新状态 · 建设中">
                <span aria-hidden="true">✦</span> 更新「我在干嘛」
              </button>
            </section>

            <section className={`${s.panel} ${s.feedCard}`}>
              <div className={s.heading}>
                <div>
                  <p className={s.overline}>FRESH FROM CLASS</p>
                  <h2>课程正在发生</h2>
                </div>
                <Link className={s.linkButton} href="/courses">
                  全部动态 <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className={s.filter} role="tablist" aria-label="课程筛选">
                <button
                  type="button"
                  className={`${s.chip} ${filter === "all" ? s.selected : ""}`}
                  onClick={() => setFilter("all")}
                >
                  全部 <i>{data.feed.length}</i>
                </button>
                {feedCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`${s.chip} ${filter === c.id ? s.selected : ""}`}
                    onClick={() => setFilter(c.id)}
                  >
                    <span className={`${s.tinyAvatar} ${s[c.avatarColor]}`}>{c.initial}</span>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className={s.feedList}>
                {filteredFeed.map((p) => (
                  <FeedItem key={p.id} p={p} />
                ))}
              </div>
            </section>

            <section className={s.sideStack}>
              <article className={s.scoreCard}>
                <div className={s.scoreTop}>
                  <span className={s.scoreIcon} aria-hidden="true">
                    ✳
                  </span>
                  <span>你的信用积分</span>
                </div>
                <div className={s.scoreNumber}>
                  {data.score.score > 0 ? data.score.score : "—"}
                  <small> / {data.score.max}</small>
                </div>
                <div className={s.scoreLine}>
                  <i style={{ width: `${(data.score.score / data.score.max) * 100}%` }} />
                </div>
                <p>{data.score.note}</p>
              </article>
              <article className={s.readingCard}>
                <span className={s.bookSpine}>
                  本季
                  <br />
                  必读
                </span>
                <div>
                  <p className={s.overline}>READING LEAGUE</p>
                  {data.reading.progress > 0 ? (
                    <>
                      <h3>
                        你本周读了
                        <br />
                        <b>{data.reading.thisWeek}</b>
                      </h3>
                      <p>
                        《{data.reading.bookTitle}》· {data.reading.progress}%
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>
                        阅读联赛
                        <br />
                        <b>建设中</b>
                      </h3>
                      <p>{data.reading.bookTitle}</p>
                    </>
                  )}
                </div>
              </article>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function ClassRow({ e }: { e: ScheduleEntry }) {
  const rowClass = [s.classRow, e.state === "free" ? s.muted : ""].filter(Boolean).join(" ");
  const colorClass = e.course ? s[e.course.avatarColor] : s.mint;
  return (
    <article className={rowClass}>
      <time>
        {e.startsAt}
        <small>{e.endsAt}</small>
      </time>
      <div className={`${s.classColor} ${colorClass}`} />
      <div className={s.classCopy}>
        {e.state === "now" && <span className={s.nowTag}>正在发生</span>}
        {e.change && (
          <span className={s.changeTag}>
            {e.change.changeType === "location"
              ? "地点变更"
              : e.change.changeType === "time"
                ? "时间变更"
                : e.change.changeType === "cancelled"
                  ? "已取消"
                  : "有变化"}
          </span>
        )}
        <h3>{e.title}</h3>
        {e.subtitle && <p>{e.subtitle}</p>}
      </div>
      {e.state === "free" ? (
        <button
          className={s.plusButton}
          type="button"
          disabled
          title="为此时段添加计划 · 建设中"
          aria-label="为此时段添加计划"
        >
          ＋
        </button>
      ) : (
        <button
          className={`${s.roundAction} ${e.change ? s.pale : ""}`}
          type="button"
          disabled
          title="进入课程 · Phase 5"
          aria-label={`进入${e.title}`}
        >
          →
        </button>
      )}
    </article>
  );
}

function FeedItem({ p }: { p: FeedPost }) {
  return (
    <article className={s.feedItem}>
      <div className={s.feedMeta}>
        <span className={`${s.tinyAvatar} ${s[p.course.avatarColor]}`}>{p.course.initial}</span>
        <b>{p.course.name}</b>
        <span>· {p.publishedAtLabel}</span>
      </div>
      {p.kind === "photo" ? (
        <div className={s.noteRow}>
          <div>
            <h3>{p.title}</h3>
            {p.excerpt && <p>{p.excerpt}</p>}
          </div>
          <div className={s.photoPile} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : (
        <>
          <h3>{p.title}</h3>
          {p.excerpt && <p>{p.excerpt}</p>}
        </>
      )}
      <div className={s.feedFooter}>
        <span>{p.watching ? `${p.watching} 人正在看` : "课程动态"}</span>
        <button type="button" disabled title="评论 · 建设中">
          {p.commentCount} 评论
        </button>
      </div>
    </article>
  );
}

function LoadingGrid() {
  return (
    <div className={s.grid} aria-busy="true" aria-label="正在加载今天">
      <div className={`${s.panel} ${s.skeleton}`} style={{ minHeight: 320 }} />
      <div className={`${s.panel} ${s.skeleton}`} style={{ minHeight: 320 }} />
      <div className={`${s.panel} ${s.skeleton} ${s.feedCard}`} style={{ minHeight: 220 }} />
      <div className={s.skeleton} style={{ minHeight: 200, borderRadius: 20 }} />
    </div>
  );
}
