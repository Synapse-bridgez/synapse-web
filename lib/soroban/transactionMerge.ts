import { MOCK_TXS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";
import type { NormalizedSorobanEvent } from "./events";
import { txCache, type TxCache } from "@/lib/storage/txCache";

export const PLACEHOLDER_MARKER = "—";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Tolerantly maps a decoded get_transaction() struct onto our Transaction shape. */
export function nativeToTransaction(
  id: string,
  native: unknown,
  fallback: Transaction
): Transaction {
  if (typeof native !== "object" || native === null) return fallback;
  const n = native as Record<string, unknown>;
  return {
    id,
    asset: isString(n.asset) ? n.asset : fallback.asset,
    amount: isNumber(n.amount) ? n.amount : fallback.amount,
    status: isString(n.status)
      ? (n.status.toUpperCase() as Transaction["status"])
      : fallback.status,
    timestamp: fallback.timestamp,
    from: isString(n.from) ? n.from : fallback.from,
    to: isString(n.to) ? n.to : fallback.to,
    memo: isString(n.memo) ? n.memo : fallback.memo,
    callback_url: isString(n.callback_url) ? n.callback_url : fallback.callback_url,
    retries: isNumber(n.retries) ? n.retries : fallback.retries,
    created_at: isNumber(n.created_at) ? n.created_at : fallback.created_at,
  };
}

/**
 * Merges the mock baseline with live events from the RPC event poller:
 * StatusChanged updates known transactions in place, and
 * TransactionRegistered inserts a minimal placeholder row for
 * transactions the mock data doesn't know about.
 */
export function mergeTransactionEvents(events: NormalizedSorobanEvent[]): Transaction[] {
  const txMap = new Map<string, Transaction>();
  for (const tx of MOCK_TXS) {
    txMap.set(tx.id, tx);
  }
  for (const event of events) {
    if (event.type === "StatusChanged" && event.txId && event.toStatus) {
      const existing = txMap.get(event.txId);
      if (existing) {
        txMap.set(event.txId, {
          ...existing,
          status: event.toStatus as Transaction["status"],
          timestamp: event.timestamp,
        });
      }
    }

    if (event.type === "TransactionRegistered" && event.txId && !txMap.has(event.txId)) {
      txMap.set(event.txId, {
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
  }
  return Array.from(txMap.values());
}

/**
 * Merges cached (IndexedDB) history with fresh RPC/poller data. Fresh data is
 * authoritative for any tx_id it contains; cached records fill in history that
 * has aged out of the RPC event retention window. Result is newest-first.
 */
export function mergeCachedTransactions(
  fresh: Transaction[],
  cached: Transaction[]
): Transaction[] {
  const txMap = new Map<string, Transaction>();
  for (const tx of cached) txMap.set(tx.id, tx);
  for (const tx of fresh) txMap.set(tx.id, tx);
  return Array.from(txMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Loads persisted history from the cache and merges it with fresh data,
 * persisting the fresh records so future reloads retain them. Falls back to
 * fresh-only data when IndexedDB is unavailable.
 */
export async function loadMergedTransactions(
  fresh: Transaction[],
  cache: TxCache = txCache
): Promise<Transaction[]> {
  let cached: Transaction[] = [];
  try {
    cached = await cache.getAll();
  } catch {
    cached = [];
  }
  const merged = mergeCachedTransactions(fresh, cached);
  try {
    await cache.putMany(fresh);
  } catch {
    // Persistence is best-effort; merged data is still returned.
  }
  return merged;
}
