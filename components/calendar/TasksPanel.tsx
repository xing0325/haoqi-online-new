"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import s from "./TasksPanel.module.css";

function dueLabel(dueAt: string | null): { text: string; risk: boolean } | null {
  if (!dueAt) return null;
  const risk = new Date(dueAt).getTime() - Date.now() <= 48 * 3600e3; // 48h 内或已过期 → Deadline Risk
  const d = new Date(dueAt);
  const p = (n: number) => String(n).padStart(2, "0");
  return { text: `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`, risk };
}

export default function TasksPanel({
  tasks,
  onAdd,
  onToggle,
  onDelete,
  onSchedule,
}: {
  tasks: Task[];
  onAdd: (title: string, dueAt: string | null) => void;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSchedule: (t: Task) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const parking = tasks.filter((t) => !t.scheduledEventId); // 未安排（含已完成）
  const todoCount = parking.filter((t) => t.status === "todo").length;
  const visible = showDone ? parking : parking.filter((t) => t.status === "todo");
  const sorted = [...visible].sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1; // 已完成沉底
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
  const doneCount = parking.length - todoCount;

  function add() {
    if (!title.trim()) return;
    onAdd(title.trim(), due ? new Date(due).toISOString() : null);
    setTitle("");
    setDue("");
  }

  return (
    <div className={s.panel}>
      <button type="button" className={s.head} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={s.headTitle}>任务停车场</span>
        <span className={s.count}>{todoCount}</span>
        <span className={s.chev}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className={s.body}>
          <div className={s.addRow}>
            <input
              className={s.addInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="加个待办，先扔进来…"
              aria-label="新任务标题"
            />
            <input
              className={s.addDue}
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              aria-label="截止时间（可空）"
            />
            <button type="button" className={s.addBtn} onClick={add}>
              加
            </button>
          </div>
          {doneCount > 0 && (
            <label className={s.showDoneToggle}>
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> 显示已完成（{doneCount}）
            </label>
          )}
          {sorted.length === 0 ? (
            <p className={s.empty}>没有待安排的任务。脑子里的事先扔进来，再拖到日历上排时间。</p>
          ) : (
            <ul className={s.list}>
              {sorted.map((t) => {
                const dl = dueLabel(t.dueAt);
                const done = t.status === "done";
                return (
                  <li key={t.id} className={s.item}>
                    <button
                      type="button"
                      className={`${s.check} ${done ? s.checkOn : ""}`}
                      aria-label={done ? "取消完成" : "标记完成"}
                      onClick={() => onToggle(t)}
                    />
                    <span className={`${s.titleText} ${done ? s.titleDone : ""}`}>{t.title}</span>
                    {dl && !done && <span className={`${s.due} ${dl.risk ? s.dueRisk : ""}`}>{dl.text}</span>}
                    {!done && (
                      <button type="button" className={s.sched} onClick={() => onSchedule(t)}>
                        安排
                      </button>
                    )}
                    <button type="button" className={s.del} aria-label="删除任务" onClick={() => onDelete(t)}>
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
