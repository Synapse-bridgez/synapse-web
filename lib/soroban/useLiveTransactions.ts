"use client";
import { useMemo } from "react";
import { useSorobanEvents } from "./SorobanProvider";
import { MOCK_TXS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";

/**
 * Merges the mock baseline with live StatusChanged events from the RPC
 * event poller, so status transitions on known transactions animate in
 * real time even before a real contract backs the demo data.
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
    }
    return Array.from(txMap.values());
  }, [events]);
}
