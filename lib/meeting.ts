// 会议链接识别：从文本里抽出已知会议平台的 URL，给「进入会议」一键按钮用。
// 精确优先：只认腾讯会议/飞书/Zoom/Google Meet/钉钉；通用 URL 不当会议（避免文档/资料链接误判）。

export type MeetingLink = { provider: string; url: string };

const PROVIDERS: { name: string; test: (host: string) => boolean }[] = [
  { name: "腾讯会议", test: (h) => h.includes("meeting.tencent.com") || h.includes("tencentmeeting.com") },
  { name: "飞书", test: (h) => h.includes("feishu.cn") || h.includes("larksuite.com") },
  { name: "Zoom", test: (h) => h.endsWith("zoom.us") || h.includes(".zoom.us") },
  { name: "Google Meet", test: (h) => h === "meet.google.com" || h.endsWith(".meet.google.com") },
  { name: "钉钉", test: (h) => h.includes("dingtalk.com") },
];

export function detectMeetingLink(text: string | null | undefined): MeetingLink | null {
  if (!text) return null;
  const matches = text.match(/https?:\/\/[^\s，。、）)】\]》]+/g);
  if (!matches) return null;
  for (const raw of matches) {
    const url = raw.replace(/[.,;:!?。，、）)】\]》]+$/, "");
    let host = "";
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      continue;
    }
    for (const p of PROVIDERS) if (p.test(host)) return { provider: p.name, url };
  }
  return null;
}
