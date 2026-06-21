// 用 Playwright 给本地 dev server 截图（截图 MCP 在这套 Next dev 上反复超时，绕过它）。
// 用法：node scripts/shot.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3210";
const outDir = process.argv[3] ?? "C:/Users/david/haoqi-online/.shots";
await mkdir(outDir, { recursive: true });

const shots = [
  { path: "/", name: "home-desktop", w: 1280, h: 860 },
  { path: "/credits", name: "credits-desktop", w: 1280, h: 860 },
  { path: "/", name: "home-mobile", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.goto(base + s.path, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  const file = `${outDir}/${s.name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log("shot:", file);
  await page.close();
}
await browser.close();
console.log("done");
