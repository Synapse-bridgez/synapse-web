import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const healthMock = vi.fn();
vi.mock("./SorobanProvider", () => ({
  useSorobanHealth: () => healthMock(),
}));

import { useSorobanStatus } from "./useSorobanStatus";

describe("useSorobanStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    healthMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports connected when healthy", () => {
    healthMock.mockReturnValue({ connected: true, error: null, lastEventTimestamp: null });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.status).toBe("connected");
    expect(result.current.lastEventAge).toBeNull();
  });

  it("reports disconnected when not connected", () => {
    healthMock.mockReturnValue({ connected: false, error: null, lastEventTimestamp: null });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.status).toBe("disconnected");
  });

  it("reports error with priority over connected", () => {
    healthMock.mockReturnValue({ connected: true, error: "boom", lastEventTimestamp: null });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.status).toBe("error");
  });

  it("defaults failover surface when fields are absent", () => {
    healthMock.mockReturnValue({ connected: true, error: null, lastEventTimestamp: null });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.activeEndpoint).toBeNull();
    expect(result.current.endpoints).toEqual([]);
    expect(result.current.isFailingOver).toBe(false);
  });

  it("passes through failover surface", () => {
    const endpoints = [{ url: "https://a" }, { url: "https://b" }];
    healthMock.mockReturnValue({
      connected: true,
      error: null,
      lastEventTimestamp: null,
      activeEndpoint: "https://b",
      endpoints,
      isFailingOver: true,
    });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.activeEndpoint).toBe("https://b");
    expect(result.current.endpoints).toBe(endpoints);
    expect(result.current.isFailingOver).toBe(true);
  });

  it("formats event age in seconds and minutes as time advances", () => {
    healthMock.mockReturnValue({
      connected: true,
      error: null,
      lastEventTimestamp: Date.now() - 3000,
    });
    const { result } = renderHook(() => useSorobanStatus());
    expect(result.current.lastEventAge).toBe("3s ago");

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(result.current.lastEventAge).toBe("1m ago");
  });

  it("clears the interval on unmount", () => {
    healthMock.mockReturnValue({
      connected: true,
      error: null,
      lastEventTimestamp: Date.now(),
    });
    const { unmount } = renderHook(() => useSorobanStatus());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
