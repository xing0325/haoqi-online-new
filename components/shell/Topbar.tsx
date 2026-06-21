"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import styles from "./Topbar.module.css";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((i) => isActive(i.href, pathname));

  return (
    <header className={styles.topbar}>
      <button className={styles.menu} type="button" aria-label="打开导航" onClick={onMenu}>
        ☰
      </button>
      <div className={styles.crumb}>
        好奇学习社区 / <span>{current?.label ?? "此刻"}</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="搜索（建设中）"
          title="搜索 · 建设中"
          disabled
        >
          ⌕
        </button>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="通知（建设中）"
          title="通知 · 建设中"
          disabled
        >
          ♧
        </button>
        <button
          className={styles.newButton}
          type="button"
          title="发起一件事 · 建设中"
          disabled
        >
          <span aria-hidden="true">＋</span> 发起一件事
        </button>
      </div>
    </header>
  );
}
