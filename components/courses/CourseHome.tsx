"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import s from "./Courses.module.css";
import { getCourse, getCoursePosts } from "@/lib/data";
import type { Course, PostListItem } from "@/lib/types";

export default function CourseHome() {
  const id = useSearchParams().get("id") ?? "";
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setNotFound(true);
      return;
    }
    Promise.all([getCourse(id), getCoursePosts(id)])
      .then(([c, p]) => {
        if (!active) return;
        if (!c) {
          setNotFound(true);
          return;
        }
        setCourse(c);
        setPosts(p);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className={s.view}>
      <Link href="/courses" className={s.backLink}>
        ← 全部课程
      </Link>

      {notFound && (
        <div className={s.state}>
          没找到这门课。<Link href="/courses">回课程列表</Link>
        </div>
      )}
      {!notFound && !course && <div className={s.state}>正在加载…</div>}

      {course && (
        <>
          <div className={s.courseHeader}>
            <span className={`${s.courseBigAvatar} ${s[course.avatarColor]}`}>{course.initial}</span>
            <div>
              <h1>{course.name}</h1>
              {course.description && <p>{course.description}</p>}
            </div>
          </div>

          <p className={s.sectionLabel}>课程动态 · {posts.length} 条</p>
          <div className={s.feed}>
            {posts.map((p) => (
              <Link key={p.id} href={`/post?id=${p.id}`} className={s.postCard}>
                <h3>{p.title}</h3>
                {p.kind === "photo" ? (
                  <span className={s.coverTag}>图文笔记</span>
                ) : p.excerpt ? (
                  <p>{p.excerpt}</p>
                ) : null}
                <div className={s.postFoot}>
                  <span>{p.publishedAtLabel}</span>
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
