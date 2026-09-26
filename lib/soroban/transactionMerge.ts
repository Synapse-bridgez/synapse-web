import type { Transaction, TransactionStatus } from "@/lib/types";
import type { NormalizedSorobanEvent } from "./events";
import { MOCK_TXS } from "@/lib/mock-data";

export const PLACEHOLDER_MARKER = "—";

/**
 * Optimistic overlay entry: a locally-pending lifecycle transition that has
 * been submitted but not yet observed by the poller.
 */
export interface OptimisticTransition {
  txId: string;
  /** Expected status once the on-chain event is confirmed. */
  expectedStatus: TransactionStatus;
  /** Status to restore if the submission fails/reverts. */
  previousStatus: TransactionStatus;
  /** Wall-clock time the transition was submitted. */
  submittedAt: number;
  /** Whether the submission has failed and the overlay should roll back. */
  failed?: boolean;
  /** Optional human-readable error to surface on rollback. */
  error?: string;
}

/** Default timeout (ms) after which an unconfirmed optimistic state rolls back. */
export const OPTIMISTIC_TIMEOUT_MS = 30_000;

/**
 * Overlays locally-pending transitions on top of poller-confirmed state.
 *
 * - Applies the expected status immediately so the UI feels responsive.
 * - Clears the overlay once the poller observes the expected status.
 * - Rolls back to the previous status when the submission fails or when the
 *   overlay has not been confirmed within `timeoutMs`.
 */
export function applyOptimisticOverlay(
  transactions: Transaction[],
  transitions: OptimisticTransition[],
  now: number = Date.now(),
  timeoutMs: number = OPTIMISTIC_TIMEOUT_MS
): Transaction[] {
  if (transitions.length === 0) return transactions;

  const byId = new Map(transitions.map((t) => [t.txId, t]));

  return transactions.map((tx) => {
    const transition = byId.get(tx.id);
    if (!transition) return tx;

    // Poller caught up: the confirmed status matches the expected one.
    if (tx.status === transition.expectedStatus) return tx;

    const expired = now - transition.submittedAt > timeoutMs;
    if (transition.failed || expired) {
      return { ...tx, status: transition.previousStatus };
    }

    return { ...tx, status: transition.expectedStatus };
  });
}

/**
 * Drops transitions that are no longer needed: confirmed by the poller, or
 * rolled back due to failure/timeout.
 */
export function pruneOptimisticTransitions(
  transactions: Transaction[],
  transitions: OptimisticTransition[],
  now: number = Date.now(),
  timeoutMs: number = OPTIMISTIC_TIMEOUT_MS
): OptimisticTransition[] {
  const statusById = new Map(transactions.map((tx) => [tx.id, tx.status]));
  return transitions.filter((t) => {
    const confirmed = statusById.get(t.txId) === t.expectedStatus;
    const expired = now - t.submittedAt > timeoutMs;
    return !confirmed && !t.failed && !expired;
  });
}

/**
 * Merges poller-observed Soroban events onto the mock baseline, inserting
 * placeholder rows for newly-registered transaction ids.
 */
export function mergeTransactionEvents(
  events: NormalizedSorobanEvent[],
  baseline: Transaction[] = MOCK_TXS
): Transaction[] {
  let result = baseline.map((tx) => ({ ...tx }));

  for (const event of events) {
    if (event.type === "TransactionRegistered") {
      if (!result.some((tx) => tx.id === event.txId)) {
        result.push({
          id: event.txId,
          asset: PLACEHOLDER_MARKER,
          amount: 0,
          status: "PENDING",
          timestamp: event.timestamp,
          from: PLACEHOLDER_MARKER,
          to: PLACEHOLDER_MARKER,
          memo: "",
          callback_url: "",
          retries: 0,
          created_at: event.timestamp,
        });
      }
      continue;
    }

    if (event.type === "StatusChanged") {
      result = result.map((tx) =>
        tx.id === event.txId ? { ...tx, status: event.toStatus } : tx
      );
    }
  }

  return result;
}

/**
 * Maps a decoded native contract struct onto a Transaction, falling back
 * field-by-field when the decoded value is missing or has the wrong type.
 */
export function nativeToTransaction(
  id: string,
  native: unknown,
  fallback: Transaction
): Transaction {
  if (typeof native !== "object" || native === null) return fallback;
  const n = native as Record<string, unknown>;

  const pick = <K extends keyof Transaction>(key: K): Transaction[K] => {
    const value = n[key as string];
    return typeof value === typeof fallback[key]
      ? (value as Transaction[K])
      : fallback[key];
  };

  const rawStatus = n.status;
  const status =
    typeof rawStatus === "string"
      ? (rawStatus.toUpperCase() as TransactionStatus)
      : fallback.status;

  return {
    id,
    asset: pick("asset"),
    amount: pick("amount"),
    status,
    timestamp: fallback.timestamp,
    from: pick("from"),
    to: pick("to"),
    memo: pick("memo"),
    callback_url: pick("callback_url"),
    retries: pick("retries"),
    created_at: pick("created_at"),
  };
}
