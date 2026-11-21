import { useCallback, useEffect, useRef, useState } from "react";
import { withRateLimit } from "./rateLimiter";

export interface LiveTransaction {
  hash: string;
  ledger: number;
  createdAt: string;
  status: "success" | "failed" | "pending";
  sourceAccount?: string;
}

export interface UseLiveTransactionsOptions {
  /** Polling interval in milliseconds. Defaults to 5000. */
  intervalMs?: number;
  /** Maximum number of transactions to keep in state. Defaults to 25. */
  limit?: number;
  /** Whether polling is enabled. Defaults to true. */
  enabled?: boolean;
}

export interface UseLiveTransactionsResult {
  transactions: LiveTransaction[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Polls the Soroban RPC for recent transactions on a fixed interval.
 *
 * Polling is paused while the browser tab is hidden (`document.visibilityState
 * === "hidden"`) and resumes automatically when the tab becomes visible again.
 * The last known transactions are preserved across pause/resume cycles.
 */
export function useLiveTransactions(
  options: UseLiveTransactionsOptions = {}
): UseLiveTransactionsResult {
  const { intervalMs = 5000, limit = 25, enabled = true } = options;

  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest fetch implementation in a ref so the interval callback
  // always sees fresh options without re-creating the timer on every render.
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await withRateLimit(async () => {
        const res = await fetch("/api/soroban/transactions");
        if (!res.ok) {
          throw new Error(`Failed to fetch transactions: ${res.status}`);
        }
        return (await res.json()) as LiveTransaction[];
      });
      setTransactions(data.slice(0, limit));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  fetchRef.current = fetchTransactions;

  const refresh = useCallback(async () => {
    await fetchRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const isHidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    const start = () => {
      if (timer !== null) {
        return;
      }
      timer = setInterval(() => {
        void fetchRef.current();
      }, intervalMs);
    };

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (isHidden()) {
        stop();
      } else {
        // Resume polling and immediately refresh so the UI catches up on any
        // transactions that arrived while the tab was hidden.
        start();
        void fetchRef.current();
      }
    };

    // Initial fetch + start polling only when the tab is visible.
    void fetchRef.current();
    if (!isHidden()) {
      start();
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, intervalMs]);

  return { transactions, loading, error, refresh };
}
