import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RpcRateLimiter,
  computeBackoffDelay,
  rpcRateLimiter,
  withRateLimit,
} from "./rateLimiter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a limiter backed by fake timers so tests don't have to wait for
 * real wall-clock intervals.
 *
 * Call `destroy()` in afterEach to prevent timer leaks between tests.
 */
function makeLimiter(tokens = 3, intervalMs = 1_000): RpcRateLimiter {
  return new RpcRateLimiter(tokens, intervalMs);
}

function rateLimitError(): Error & { status: number } {
  const err = new Error("429 Too Many Requests") as Error & { status: number };
  err.status = 429;
  return err;
}

// ---------------------------------------------------------------------------
// Token consumption
// ---------------------------------------------------------------------------

describe("RpcRateLimiter — token consumption", () => {
  let limiter: RpcRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = makeLimiter(3, 1_000);
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  it("starts with a full bucket", () => {
    expect(limiter.stats().tokens).toBe(3);
  });

  it("decrements the token count on each acquire", async () => {
    await limiter.acquire();
    expect(limiter.stats().tokens).toBe(2);

    await limiter.acquire();
    expect(limiter.stats().tokens).toBe(1);

    await limiter.acquire();
    expect(limiter.stats().tokens).toBe(0);
  });

  it("tracks total request count", async () => {
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.stats().total).toBe(2);
  });

  it("does not count throttled requests in tokens-available path", async () => {
    await limiter.acquire();
    expect(limiter.stats().throttled).toBe(0);
  });

  it("throws for invalid constructor arguments", () => {
    expect(() => new RpcRateLimiter(0, 1_000)).toThrow(RangeError);
    expect(() => new RpcRateLimiter(1, 0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Token refill
// ---------------------------------------------------------------------------

describe("RpcRateLimiter — token refill", () => {
  let limiter: RpcRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = makeLimiter(3, 1_000);
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  it("refills the bucket to capacity after one interval", async () => {
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.stats().tokens).toBe(0);

    vi.advanceTimersByTime(1_000);

    expect(limiter.stats().tokens).toBe(3);
  });

  it("does not exceed capacity on refill", async () => {
    await limiter.acquire();
    vi.advanceTimersByTime(1_000);
    expect(limiter.stats().tokens).toBe(3);
  });

  it("refills multiple times across multiple intervals", async () => {
    await limiter.acquire();
    await limiter.acquire();
    vi.advanceTimersByTime(1_000);
    expect(limiter.stats().tokens).toBe(3);

    await limiter.acquire();
    vi.advanceTimersByTime(1_000);
    expect(limiter.stats().tokens).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Queuing when tokens exhausted
// ---------------------------------------------------------------------------

describe("RpcRateLimiter — queuing when tokens exhausted", () => {
  let limiter: RpcRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = makeLimiter(2, 500);
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  it("queues requests when the bucket is empty", async () => {
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.stats().tokens).toBe(0);

    let resolved = false;
    const pending = limiter.acquire().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    expect(limiter.stats().queued).toBe(1);

    vi.advanceTimersByTime(500);
    await pending;

    expect(resolved).toBe(true);
    expect(limiter.stats().queued).toBe(0);
  });

  it("resolves queued requests in FIFO order", async () => {
    await limiter.acquire();
    await limiter.acquire();

    const order: number[] = [];
    const p1 = limiter.acquire().then(() => order.push(1));
    const p2 = limiter.acquire().then(() => order.push(2));

    vi.advanceTimersByTime(500);
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it("increments throttledRequests for each queued call", async () => {
    await limiter.acquire();
    await limiter.acquire();

    const p1 = limiter.acquire();
    const p2 = limiter.acquire();

    expect(limiter.stats().throttled).toBe(2);

    vi.advanceTimersByTime(500);
    await Promise.all([p1, p2]);
  });
});

// ---------------------------------------------------------------------------
// withRateLimit helper
// ---------------------------------------------------------------------------

describe("withRateLimit", () => {
  it("resolves with the return value of fn", async () => {
    const result = await withRateLimit(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("propagates rejections from fn", async () => {
    await expect(withRateLimit(() => Promise.reject(new Error("rpc failure")))).rejects.toThrow(
      "rpc failure"
    );
  });

  it("calls fn exactly once per invocation", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await withRateLimit(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Exponential backoff on 429s
// ---------------------------------------------------------------------------

describe("withRateLimit — exponential backoff", () => {
  it("computeBackoffDelay grows exponentially and caps", () => {
    expect(computeBackoffDelay(0, 100, 5_000)).toBe(100);
    expect(computeBackoffDelay(1, 100, 5_000)).toBe(200);
    expect(computeBackoffDelay(2, 100, 5_000)).toBe(400);
    expect(computeBackoffDelay(10, 100, 5_000)).toBe(5_000);
  });

  it("retries with increasing delays and eventually rejects with the original error", async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms);
    });
    const original = rateLimitError();
    const fn = vi.fn().mockRejectedValue(original);

    await expect(
      withRateLimit(fn, { baseDelayMs: 100, maxDelayMs: 1_000, maxAttempts: 3, sleep })
    ).rejects.toBe(original);

    // Initial call + 3 retries.
    expect(fn).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([100, 200, 400]);
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("caps the backoff delay at maxDelayMs", async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms);
    });
    const fn = vi.fn().mockRejectedValue(rateLimitError());

    await expect(
      withRateLimit(fn, { baseDelayMs: 100, maxDelayMs: 250, maxAttempts: 3, sleep })
    ).rejects.toThrow("429");

    expect(delays).toEqual([100, 200, 250]);
  });

  it("does not retry non-rate-limit errors", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(withRateLimit(fn, { sleep })).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("succeeds after transient 429s", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError())
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValue("ok");

    await expect(withRateLimit(fn, { sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Logging / telemetry when throttled
// ---------------------------------------------------------------------------

describe("RpcRateLimiter — logging when throttled", () => {
  let limiter: RpcRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    limiter = makeLimiter(1, 1_000);
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("emits a console.warn with [RPC Rate Limiter] prefix when throttled", async () => {
    await limiter.acquire();

    const pending = limiter.acquire();

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[RPC Rate Limiter]"));

    vi.advanceTimersByTime(1_000);
    await pending;
  });

  it("warns only once per throttle window, not for every queued call", async () => {
    await limiter.acquire();

    const p1 = limiter.acquire();
    const p2 = limiter.acquire();

    const throttleWarns = (
      console.warn as unknown as ReturnType<typeof vi.spyOn>
    ).mock.calls.filter(
      (args) =>
        String(args[0]).includes("[RPC Rate Limiter]") && String(args[0]).includes("Throttling")
    );
    expect(throttleWarns.length).toBe(1);

    vi.advanceTimersByTime(1_000);
    await p1;
    vi.advanceTimersByTime(1_000);
    await p2;
  });

  it("emits a console.warn when draining the queue after refill", async () => {
    await limiter.acquire();

    const pending = limiter.acquire();

    vi.advanceTimersByTime(1_000);
    await pending;

    const drainWarns = (console.warn as unknown as ReturnType<typeof vi.spyOn>).mock.calls.filter(
      (args) => String(args[0]).includes("[RPC Rate Limiter]")
    );
    expect(drainWarns.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Singleton sanity
// ---------------------------------------------------------------------------

describe("rpcRateLimiter singleton", () => {
  it("is an RpcRateLimiter instance", () => {
    expect(rpcRateLimiter).toBeInstanceOf(RpcRateLimiter);
  });
});
