"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/browser";
import s from "./Auth.module.css";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pwd,
    });
    setBusy(false);
    if (error) setErr("登录失败：邮箱或密码不对，或这个邮箱不在好奇名单里。");
    // 成功后 onAuthStateChange 会自动刷新进入 app
  }

  return (
    <div className={s.wrap}>
      <form className={s.card} onSubmit={submit}>
        <span className={s.mark} aria-hidden="true">
          好
        </span>
        <h1>好奇 Online</h1>
        <p className={s.sub}>用名单里的邮箱登录</p>
        <input
          className={s.input}
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          className={s.input}
          type="password"
          placeholder="密码"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          required
          autoComplete="current-password"
        />
        {err && <p className={s.err}>{err}</p>}
        <button className={s.btn} type="submit" disabled={busy || !email || !pwd}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
