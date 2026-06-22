import { describe, it, expect } from "vitest";
import { detectMeetingLink } from "./meeting";

describe("detectMeetingLink", () => {
  it("腾讯会议", () => {
    expect(detectMeetingLink("https://meeting.tencent.com/dm/abc123")).toEqual({
      provider: "腾讯会议",
      url: "https://meeting.tencent.com/dm/abc123",
    });
  });
  it("飞书（夹在文字中间）", () => {
    expect(detectMeetingLink("线上 https://vc.feishu.cn/j/987654321 见")).toEqual({
      provider: "飞书",
      url: "https://vc.feishu.cn/j/987654321",
    });
  });
  it("Zoom（带 query）", () => {
    expect(detectMeetingLink("https://us05web.zoom.us/j/123?pwd=xY")).toEqual({
      provider: "Zoom",
      url: "https://us05web.zoom.us/j/123?pwd=xY",
    });
  });
  it("Google Meet（不与 Google Docs 混淆）", () => {
    expect(detectMeetingLink("https://meet.google.com/abc-defg-hij")?.provider).toBe("Google Meet");
    expect(detectMeetingLink("资料 https://docs.google.com/document/d/1")).toBeNull();
  });
  it("钉钉", () => {
    expect(detectMeetingLink("钉钉 https://meeting.dingtalk.com/j/xxx")?.provider).toBe("钉钉");
  });
  it("去掉尾部中文句号", () => {
    expect(detectMeetingLink("链接：https://meeting.tencent.com/dm/xyz。")?.url).toBe(
      "https://meeting.tencent.com/dm/xyz",
    );
  });
  it("非会议链接 / 无链接 / 空 → null", () => {
    expect(detectMeetingLink("https://example.com/room/5")).toBeNull();
    expect(detectMeetingLink("教室 A301")).toBeNull();
    expect(detectMeetingLink("")).toBeNull();
    expect(detectMeetingLink(null)).toBeNull();
  });
});
