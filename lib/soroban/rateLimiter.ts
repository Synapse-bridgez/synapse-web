/**
 * RPC rate limiter with exponential backoff for rate-limited (429) calls.
 *
 * The limiter is a token bucket: callers `acquire()` a token before hitting
 * the RPC endpoint. When the endpoint rejects with a 429, `withRateLimit`
 * retries the call using exponential backoff (capped) instead of re-queueing
 * immediately, so a burst of 429s does not turn into a tight retry loop.
 */

export interface RateLimiterOptions {
  /** Base delay (ms) for the first backoff step. */
  baseDelayMs?: number;
  /** Maximum delay (ms) between retries. */
  maxDelayMs?: number;
  /** Maximum number of retry attempts after the initial call. */
  maxAttempts?: number;
  /** Injectable sleep so tests can use fake timers without real waiting. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 5;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number; statusCode?: number }).status ??
    (error as { statusCode?: number }).statusCode;
  if (status === 429) return true;
  const message = (error as { message?: string }).message ?? "";
  return /429|rate.?limit|too many requests/i.test(message);
}

/**
 * Computes the backoff delay for a given attempt (0-based).
 * Exponential with a cap.
 */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS
): number {
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, maxDelayMs);
}

export class RpcRateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private queue: Array<() => void> = [];
  private total = 0;
  private throttled = 0;
  private warnedThisWindow = false;

  constructor(capacity: number, intervalMs: number) {
    if (capacity <= 0) throw new RangeError("capacity must be > 0");
    if (intervalMs <= 0) throw new RangeError("intervalMs must be > 0");
    this.capacity = capacity;
    this.tokens = capacity;
    this.intervalMs = intervalMs;
    this.timer = setInterval(() => this.refill(), intervalMs);
    // Do not keep the process alive solely for the refill timer.
    if (typeof this.timer === "object" && this.timer && "unref" in this.timer) {
      (this.timer as { unref?: () => void }).unref?.();
    }
  }

  private refill(): void {
    this.tokens = this.capacity;
    this.warnedThisWindow = false;
    if (this.queue.length > 0) {
      console.warn(
        `[RPC Rate Limiter] Draining ${this.queue.length} queued request(s) after refill`
      );
      const pending = this.queue;
      this.queue = [];
      for (const resolve of pending) resolve();
    }
  }

  acquire(): Promise<void> {
    this.total += 1;
    if (this.tokens > 0) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    this.throttled += 1;
    if (!this.warnedThisWindow) {
      this.warnedThisWindow = true;
      console.warn(
        `[RPC Rate Limiter] Throttling requests — bucket empty, queuing until next refill`
      );
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  stats(): { tokens: number; total: number; throttled: number; queued: number } {
    return {
      tokens: this.tokens,
      total: this.total,
      throttled: this.throttled,
      queued: this.queue.length,
    };
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

/** Shared singleton used by the Soroban callers. */
export const rpcRateLimiter = new RpcRateLimiter(10, 1_000);

/**
 * Runs `fn` under the shared rate limiter, retrying rate-limited (429)
 * failures with capped exponential backoff. After `maxAttempts` retries the
 * original error is surfaced to the caller.
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options: RateLimiterOptions = {}
): Promise<T> {
  const {
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    sleep = defaultSleep,
  } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await rpcRateLimiter.acquire();
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= maxAttempts) {
        throw error;
      }
      const delay = computeBackoffDelay(attempt, baseDelayMs, maxDelayMs);
      attempt += 1;
      await sleep(delay);
    }
  }
}
