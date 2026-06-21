export type NavItem = { href: string; label: string; icon: string };

/** 侧栏 7 个空间入口；Sidebar 与 Topbar 面包屑共用。 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "此刻", icon: "⌂" },
  { href: "/courses", label: "课程", icon: "◒" },
  { href: "/schedule", label: "我的一周", icon: "▦" },
  { href: "/credits", label: "信用积分", icon: "✳" },
  { href: "/reading", label: "阅读联赛", icon: "⌁" },
  { href: "/projects", label: "做事空间", icon: "◫" },
  { href: "/community", label: "大家在干嘛", icon: "◎" },
];

/** 给定 pathname，判断某个入口是否处于激活态。
 *  课程的子页用查询参数路由（/course、/post），也归到「课程」入口高亮。 */
export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/courses") {
    return pathname === "/courses" || pathname === "/course" || pathname === "/post";
  }
  return pathname.startsWith(href);
}
