import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage（脚手架 smoke）", () => {
  it("渲染品牌名", () => {
    render(<HomePage />);
    expect(screen.getByText("好奇 Online")).toBeInTheDocument();
  });
});
