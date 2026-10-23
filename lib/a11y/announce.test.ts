import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { announce, subscribeAnnouncements } from "./announce";
import type { Announcement } from "./announce";

// Helper to flush all pending timers and return after a tick
const flush = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("announce (#327)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when message is empty", () => {
    const listener = vi.fn();
    const unsub = subscribeAnnouncements(listener);
    announce("");
    vi.advanceTimersByTime(300);
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("does nothing when message is not a string", () => {
    const listener = vi.fn();
    const unsub = subscribeAnnouncements(listener);
    // @ts-expect-error — testing runtime guard
    announce(42);
    vi.advanceTimersByTime(300);
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("dispatches assertive announcements immediately", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);

    announce("Critical error", "assertive");

    expect(listener).toHaveBeenCalledTimes(1);
    const [call] = listener.mock.calls[0];
    expect(call.message).toBe("Critical error");
    expect(call.politeness).toBe("assertive");
    expect(typeof call.id).toBe("string");
    expect(typeof call.timestamp).toBe("number");
    unsub();
  });

  it("dispatches immediate:true polite announcements without waiting for debounce", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);

    announce("Immediate polite", "polite", { immediate: true });

    expect(listener).toHaveBeenCalledTimes(1);
    const [call] = listener.mock.calls[0];
    expect(call.message).toBe("Immediate polite");
    expect(call.politeness).toBe("polite");
    unsub();
  });

  it("debounces a single polite announcement and sends it after 250 ms", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);

    announce("Hello world", "polite");
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].message).toBe("Hello world");
    expect(listener.mock.calls[0][0].politeness).toBe("polite");
    unsub();
  });

  it("batches multiple polite announcements into one message", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);

    announce("Update A", "polite");
    announce("Update B", "polite");
    announce("Update C", "polite");

    vi.advanceTimersByTime(250);

    expect(listener).toHaveBeenCalledTimes(1);
    const { message } = listener.mock.calls[0][0];
    expect(message).toContain("3 updates");
    expect(message).toContain("Update A");
    expect(message).toContain("Update B");
    expect(message).toContain("Update C");
    unsub();
  });

  it("resets the debounce timer when a second polite message arrives before 250 ms", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);

    announce("First", "polite");
    vi.advanceTimersByTime(200);
    // No call yet — debounce resets
    announce("Second", "polite");
    vi.advanceTimersByTime(200);
    // Still inside the new 250 ms window
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100); // total 500 ms, but second fire at 400 ms
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("notifies all active listeners", () => {
    const l1 = vi.fn<[Announcement], void>();
    const l2 = vi.fn<[Announcement], void>();
    const unsub1 = subscribeAnnouncements(l1);
    const unsub2 = subscribeAnnouncements(l2);

    announce("Broadcast", "assertive");

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    unsub1();
    unsub2();
  });

  it("does not notify a listener that has been unsubscribed", () => {
    const listener = vi.fn<[Announcement], void>();
    const unsub = subscribeAnnouncements(listener);
    unsub();

    announce("After unsub", "assertive");

    expect(listener).not.toHaveBeenCalled();
  });

  it("generates unique ids for successive assertive announcements", () => {
    const received: Announcement[] = [];
    const unsub = subscribeAnnouncements((a) => received.push(a));

    announce("Msg 1", "assertive");
    announce("Msg 2", "assertive");

    expect(received[0].id).not.toBe(received[1].id);
    unsub();
  });
});

describe("subscribeAnnouncements (#328)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a cleanup function that removes the listener", () => {
    const listener = vi.fn();
    const cleanup = subscribeAnnouncements(listener);
    expect(typeof cleanup).toBe("function");

    cleanup();

    vi.useFakeTimers();
    announce("Should not reach listener", "assertive");
    expect(listener).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("can subscribe multiple independent listeners", () => {
    const a = vi.fn<[Announcement], void>();
    const b = vi.fn<[Announcement], void>();

    const unsubA = subscribeAnnouncements(a);
    const unsubB = subscribeAnnouncements(b);

    vi.useFakeTimers();
    announce("Ping", "assertive");

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
    vi.useRealTimers();
  });

  it("calling the cleanup function twice is idempotent", () => {
    const listener = vi.fn();
    const cleanup = subscribeAnnouncements(listener);
    cleanup();
    expect(() => cleanup()).not.toThrow();

    vi.useFakeTimers();
    announce("Idempotent", "assertive");
    expect(listener).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("listener receives the correct Announcement shape", () => {
    const received: Announcement[] = [];
    const unsub = subscribeAnnouncements((a) => received.push(a));

    vi.useFakeTimers();
    announce("Shape test", "assertive");

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      message: "Shape test",
      politeness: "assertive",
    });
    expect(typeof received[0].id).toBe("string");
    expect(received[0].id.length).toBeGreaterThan(0);
    expect(typeof received[0].timestamp).toBe("number");

    unsub();
    vi.useRealTimers();
  });
});
