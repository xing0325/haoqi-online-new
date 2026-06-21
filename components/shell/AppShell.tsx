"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import styles from "./AppShell.module.css";

export default function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

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
