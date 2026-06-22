"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import s from "./Courses.module.css";
import { getCourse, getCoursePosts, getCourseRole } from "@/lib/data";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Course, PostListItem } from "@/lib/types";

export default function CourseHome() {
  const id = useSearchParams().get("id") ?? "";
  const { session, profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setNotFound(true);
      return;
    }
    (async () => {
      const [c, p] = await Promise.all([getCourse(id), getCoursePosts(id)]);
      if (!active) return;
      if (!c) {
        setNotFound(true);
        return;
      }
      setCourse(c);
      setPosts(p);
      if (session) {
        const role = await getCourseRole(id, session.user.id);
        if (active) setCanPost(profile?.role === "admin" || role === "teacher" || role === "assistant");
      }
    })().catch(() => {
      if (active) setNotFound(true);
    });
    return () => {
      active = false;
    };
  }, [id, session, profile]);

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

          <div className={s.listHead}>
            <p className={s.sectionLabel}>课程动态 · {posts.length} 条</p>
            {canPost && (
              <Link href={`/compose?course=${course.id}`} className={s.composeEntryBtn}>
                ＋ 发布动态
              </Link>
            )}
          </div>

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
            {posts.length === 0 && <p className={s.state}>这门课还没有动态。</p>}
          </div>
        </>
      )}
    </section>
  );
}
