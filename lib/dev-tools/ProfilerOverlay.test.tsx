import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DevProfiler } from "./ProfilerOverlay";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("DevProfiler", () => {
  it("renders its children in development", () => {
    render(
      <DevProfiler id="dev-child">
        <span>hello</span>
      </DevProfiler>,
    );
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("renders children directly in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(
      <DevProfiler id="prod-child">
        <span>prod</span>
      </DevProfiler>,
    );
    expect(screen.getByText("prod")).toBeTruthy();
  });

  it("renders nothing extra when given no children", () => {
    const { container } = render(<DevProfiler id="empty">{null}</DevProfiler>);
    expect(container.innerHTML).toBe("");
  });
});
