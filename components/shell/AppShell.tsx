"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import LoginScreen from "@/components/auth/LoginScreen";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import styles from "./AppShell.module.css";

function Shell({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  if (loading) return <div className={styles.boot}>正在进入好奇…</div>;
  if (!session) return <LoginScreen />;

  return (
    <div className={styles.shell}>
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className={styles.main}>
        <Topbar onMenu={() => setNavOpen((v) => !v)} />
        {children}
      </div>
      <div
        className={`${styles.backdrop} ${navOpen ? styles.show : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
