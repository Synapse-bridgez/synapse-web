"use client";
import { useMemo } from "react";
import { useSorobanEvents } from "./SorobanProvider";
import { MOCK_TXS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";

/**
 * Merges the mock baseline with live events from the RPC event poller:
 * StatusChanged updates known transactions in place, and
 * TransactionRegistered inserts a minimal placeholder row for
 * transactions the mock data doesn't know about (full details are
 * fetched separately via get_transaction when a wallet is connected).
 */
export function useLiveTransactions(): Transaction[] {
  const events = useSorobanEvents();

  return useMemo(() => {
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
          asset: "—",
          amount: 0,
          status: "PENDING",
          timestamp: event.timestamp,
          from: "—",
          to: "—",
          memo: "",
          callback_url: "",
          retries: 0,
          created_at: event.timestamp,
        });
      }
    }
    return Array.from(txMap.values());
  }, [events]);
}
