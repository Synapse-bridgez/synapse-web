import { describe, it, expect, vi, afterEach } from "vitest";
import { shortId, elapsed, formatAmount } from "./utils";

describe("shortId", () => {
  it("truncates to 13 characters with an ellipsis", () => {
    expect(shortId("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b…");
  });

  it("returns an em dash for an empty string", () => {
    expect(shortId("")).toBe("—");
  });

  it("does not truncate strings shorter than 13 characters", () => {
    expect(shortId("short")).toBe("short…");
  });
});

describe("elapsed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats sub-minute durations in seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
    expect(elapsed(new Date("2026-01-01T00:00:00.000Z").getTime())).toBe("30s ago");
  });

  it("formats sub-hour durations in minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:05:00.000Z"));
    expect(elapsed(new Date("2026-01-01T00:00:00.000Z").getTime())).toBe("5m ago");
  });

  it("formats durations over an hour in hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T02:00:00.000Z"));
    expect(elapsed(new Date("2026-01-01T00:00:00.000Z").getTime())).toBe("2h ago");
  });
});

describe("formatAmount", () => {
  it("formats to two decimal places", () => {
    expect(formatAmount(5)).toBe("5.00");
    expect(formatAmount(12.5)).toBe("12.50");
    expect(formatAmount(3.14159)).toBe("3.14");
  });
});
