"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./Courses.module.css";
import { createPost, getCourse, getCourseRole } from "@/lib/data";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Course } from "@/lib/types";

export default function Composer() {
  const courseId = useSearchParams().get("course") ?? "";
  const router = useRouter();
  const { session, profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!courseId || !session) return;
    let active = true;
    (async () => {
      const [c, role] = await Promise.all([getCourse(courseId), getCourseRole(courseId, session.user.id)]);
      if (!active) return;
      setCourse(c);
      setCanPost(profile?.role === "admin" || role === "teacher" || role === "assistant");
    })();
    return () => {
      active = false;
    };
  }, [courseId, session, profile]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !session) return;
    setSubmitting(true);
    setErr("");
    const res = await createPost(courseId, session.user.id, title.trim(), body, true);
    if ("error" in res) {
      setSubmitting(false);
      setErr(res.error);
      return;
    }
    router.push(`/post?id=${res.id}`);
  }

  if (!courseId) {
    return (
      <section className={s.view}>
        <div className={s.state}>
          缺少课程参数。<Link href="/courses">回课程</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={s.view}>
      <Link href={`/course?id=${courseId}`} className={s.backLink}>
        ← {course?.name ?? "课程"}
      </Link>

      {canPost === false && (
        <div className={s.state}>
          你没有在「{course?.name}」发帖的权限——只有这门课的老师 / 助教或管理员能发。
        </div>
      )}

      {canPost && (
        <form className={s.composer} onSubmit={submit}>
          <p className={s.eyebrow}>发布到 · {course?.name}</p>
          <input
            className={s.titleInput}
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
          <textarea
            className={s.bodyInput}
            placeholder="正文（支持 **加粗** 和 - 列表，空一行分段）"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
          />
          {err && <p className={s.cErr}>{err}</p>}
          <div className={s.composerActions}>
            <Link href={`/course?id=${courseId}`} className={s.cancelBtn}>
              取消
            </Link>
            <button type="submit" className={s.publishBtn} disabled={submitting || !title.trim()}>
              {submitting ? "发布中…" : "发布"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
