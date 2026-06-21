import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "好奇 Online — 今天发生什么？",
  description: "好奇学习社区的线上日常空间",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
