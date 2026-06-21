import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage（外壳 smoke）", () => {
  it("渲染一级标题", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("诚实标注首页仪表盘尚未接入", () => {
    render(<HomePage />);
    expect(screen.getByText(/Phase 4/)).toBeInTheDocument();
  });
});
