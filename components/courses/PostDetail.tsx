"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import s from "./Courses.module.css";
import { getComments, getPost } from "@/lib/data";
import type { CommentItem, PostDetail as PostDetailT } from "@/lib/types";

const IMAGE_COLORS = ["#f5cc81", "#a9d1c7", "#bdcde4", "#e9b8c4", "#cbd9a6"];

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function renderMarkdown(md: string): ReactNode[] {
  return md.split("\n\n").map((block, i) => {
    const lines = block.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*-\s*/, ""))}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{inline(block)}</p>;
  });
}

export default function PostDetail() {
  const id = useSearchParams().get("id") ?? "";
  const [post, setPost] = useState<PostDetailT | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setNotFound(true);
      return;
    }
    Promise.all([getPost(id), getComments(id)])
      .then(([p, c]) => {
        if (!active) return;
        if (!p) {
          setNotFound(true);
          return;
        }
        setPost(p);
        setComments(c);
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
      <div className={s.detail}>
        <Link href="/courses" className={s.backLink}>
          ← 课程
        </Link>

        {notFound && (
          <div className={s.state}>
            没找到这条动态。<Link href="/courses">回课程</Link>
          </div>
        )}
        {!notFound && !post && <div className={s.state}>正在加载…</div>}

        {post && (
          <>
            <div className={s.detailTop}>
              <Link href={`/course?id=${post.course.id}`} className={s.detailCourse}>
                <span
                  className={`${s.tinyAvatar} ${s[post.course.avatarColor]}`}
                  style={{ width: 34, height: 34, borderRadius: 11, fontSize: 15 }}
                >
                  {post.course.initial}
                </span>
                <span>
                  <b>{post.course.name}</b>
                  <small>课程动态 · {post.publishedAtLabel}</small>
                </span>
              </Link>
              <span className={s.detailAuthor}>
                <span className={`avatar avatar-${post.author.avatarColor}`}>{post.author.initial}</span>
              </span>
            </div>

            {post.images.length > 0 && (
              <div className={s.imageGroup} aria-label="图片组">
                {post.images.map((_, i) => (
                  <span key={i} style={{ background: IMAGE_COLORS[i % IMAGE_COLORS.length] }} />
                ))}
              </div>
            )}

            <h1>{post.title}</h1>
            <div className={s.body}>{renderMarkdown(post.bodyMarkdown)}</div>

            <div className={s.comments}>
              <h2>评论{comments.length > 0 ? ` · ${comments.length}` : ""}</h2>
              {comments.map((c) => (
                <div key={c.id} className={s.comment}>
                  <span className={`avatar avatar-${c.author.avatarColor}`}>{c.author.initial}</span>
                  <div className={s.cbody}>
                    <b>{c.author.displayName}</b>
                    <time>{c.timeLabel}</time>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>还没有评论，等你来开个头。</p>
              )}

              <div className={s.compose}>
                <input disabled placeholder="登录后可评论 · 评论功能待接后端" aria-label="评论输入（建设中）" />
                <button type="button" disabled title="评论 · 待接后端">
                  发布
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
