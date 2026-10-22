import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { DevProfiler, ProfilerOverlay } from "./ProfilerOverlay";

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

describe("ProfilerOverlay", () => {
  it("renders nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<ProfilerOverlay />);
    expect(container.innerHTML).toBe("");
  });

  it("toggles the panel via the button", () => {
    render(<ProfilerOverlay />);
    expect(screen.queryByText("Alt+P to toggle")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Profiler" }));
    expect(screen.getByText("Alt+P to toggle")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide profiler" }));
    expect(screen.queryByText("Alt+P to toggle")).toBeNull();
  });

  it("toggles via Alt+P and ignores other keys", () => {
    render(<ProfilerOverlay />);
    fireEvent.keyDown(window, { key: "p" });
    expect(screen.queryByText("Alt+P to toggle")).toBeNull();
    fireEvent.keyDown(window, { key: "P", altKey: true });
    expect(screen.getByText("Alt+P to toggle")).toBeTruthy();
  });

  it("shows recorded renders from DevProfiler", () => {
    render(
      <>
        <DevProfiler id="overlay-tracked">
          <span>x</span>
        </DevProfiler>
        <ProfilerOverlay />
      </>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Profiler" }));
    });
    expect(screen.getByText("overlay-tracked")).toBeTruthy();
    expect(screen.queryByText("No renders recorded yet.")).toBeNull();
  });
});
