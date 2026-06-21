"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Role } from "@/lib/types";
import styles from "./Sidebar.module.css";

const ROLE_LABEL: Record<Role, string> = {
  student: "学生",
  teacher: "老师",
  admin: "管理员",
};

export default function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const name = profile?.display_name ?? "…";

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`} aria-label="主导航">
      <Link className={styles.brand} href="/" onClick={onNavigate} aria-label="好奇 Online 首页">
        <span className={styles.brandMark}>好</span>
        <span>
          好奇
          <br />
          <em>ONLINE</em>
        </span>
      </Link>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.clubCard}>
          <span className={styles.clubSpark} aria-hidden="true">
            ✦
          </span>
          <p>
            本周的集体
            <br />
            好奇心 <strong>76%</strong>
          </p>
          <div className={styles.meter}>
            <i />
          </div>
        </div>
        <button className={styles.profile} type="button" onClick={() => signOut()} title="退出登录">
          <span className="avatar avatar-pink">{name.charAt(0)}</span>
          <span>
            {name}
            <small>{profile ? `${ROLE_LABEL[profile.role]} · 退出` : "加载中"}</small>
          </span>
          <b aria-hidden="true">⎋</b>
        </button>
      </div>
    </aside>
  );
}
