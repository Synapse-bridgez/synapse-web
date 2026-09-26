"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useSorobanEvents } from "./SorobanProvider";
import { simulateContractCall, stringArg } from "./contract";
import {
  mergeTransactionEvents,
  nativeToTransaction,
  PLACEHOLDER_MARKER,
} from "./transactionMerge";
import { loadCachedTransactions, saveTransactions } from "@/lib/storage/txCache";
import { useWallet } from "@/lib/wallet/WalletProvider";
import type { Transaction } from "@/lib/types";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

/**
 * Merges the mock baseline with live events from the RPC event poller (see
 * mergeTransactionEvents). When a wallet is connected and a real contract is
 * configured, placeholder rows are enriched with full details via a
 * get_transaction() read-only call.
 *
 * Observed transactions are also persisted to IndexedDB (see txCache) so the
 * dashboard retains a deeper local history across reloads than Soroban RPC's
 * event retention window allows. Cached records are merged in as the
 * authoritative "older than RPC retention" source; when IndexedDB is
 * unavailable the cache degrades to in-memory-only behavior.
 */
export function useLiveTransactions(): Transaction[] {
  const events = useSorobanEvents();
  const { address } = useWallet();
  const [enriched, setEnriched] = useState<Record<string, Transaction>>({});
  const [cached, setCached] = useState<Transaction[]>([]);
  const fetchedIds = useRef<Set<string>>(new Set());

  const baseline = useMemo(() => mergeTransactionEvents(events), [events]);

  // Load persisted history once on mount and merge it with fresh RPC data.
  useEffect(() => {
    let active = true;
    loadCachedTransactions()
      .then((records) => {
        if (active) setCached(records);
      })
      .catch(() => {
        // Cache is best-effort; fall back to in-memory-only behavior.
      });
    return () => {
      active = false;
    };
  }, []);

  const merged = useMemo(
    () => mergeTransactionEvents(events, cached),
    [events, cached]
  );

  // Persist every observed transaction so history survives page reloads.
  useEffect(() => {
    if (merged.length === 0) return;
    saveTransactions(merged).catch(() => {
      // Ignore persistence failures (e.g. IndexedDB disabled).
    });
  }, [merged]);

  useEffect(() => {
    if (!address || !CONTRACT_ID) return;

    const toFetch = merged.filter(
      (tx) => tx.asset === PLACEHOLDER_MARKER && !fetchedIds.current.has(tx.id)
    );
    if (toFetch.length === 0) return;

    for (const tx of toFetch) {
      fetchedIds.current.add(tx.id);
      simulateContractCall(RPC_URL, CONTRACT_ID, address, "get_transaction", [stringArg(tx.id)])
        .then((simulated) => {
          if (!simulated.result) return;
          const native = scValToNative(simulated.result.retval);
          setEnriched((prev) => ({ ...prev, [tx.id]: nativeToTransaction(tx.id, native, tx) }));
        })
        .catch(() => {
          // Leave the placeholder row in place; enrichment is best-effort.
        });
    }
  }, [merged, address]);

  return useMemo(() => merged.map((tx) => enriched[tx.id] ?? tx), [merged, enriched]);
}
