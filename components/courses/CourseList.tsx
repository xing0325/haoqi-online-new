"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./Courses.module.css";
import { getCourseFeed, getCourseList } from "@/lib/data";
import type { CourseListItem, FeedPost } from "@/lib/types";

export default function CourseList() {
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCourseList(), getCourseFeed()])
      .then(([c, f]) => {
        if (active) {
          setCourses(c);
          setFeed(f);
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
      <div className={s.pageHead}>
        <p className={s.eyebrow}>COURSE FEED / 课程</p>
        <h1>
          每门课，<i>都在长出</i>自己的宇宙。
        </h1>
      </div>

      {error && <div className={s.state}>课程没加载出来，刷新试试。</div>}
      {!error && !courses && <div className={s.state}>正在加载课程…</div>}

      {!error && courses && (
        <>
          <div className={s.avatarBar}>
            {courses.map((c) => (
              <Link key={c.id} href={`/course?id=${c.id}`} className={s.courseAvatar}>
                <span className={`${s.avatarDisc} ${s[c.avatarColor]}`}>
                  {c.initial}
                  {c.hasUpdate && <span className={s.dot}>{c.newCount}</span>}
                </span>
                <small>{c.name}</small>
              </Link>
            ))}
          </div>

          <p className={s.sectionLabel}>综合动态 · 最近发生</p>
          <div className={s.feed}>
            {feed.map((p) => (
              <Link key={p.id} href={`/post?id=${p.id}`} className={s.postCard}>
                <div className={s.postMeta}>
                  <span className={`${s.tinyAvatar} ${s[p.course.avatarColor]}`}>{p.course.initial}</span>
                  <b>{p.course.name}</b>
                  <span>· {p.publishedAtLabel}</span>
                </div>
                <h3>{p.title}</h3>
                {p.kind === "photo" ? (
                  <span className={s.coverTag}>图文笔记</span>
                ) : p.excerpt ? (
                  <p>{p.excerpt}</p>
                ) : null}
                <div className={s.postFoot}>
                  <span>{p.commentCount} 评论</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
