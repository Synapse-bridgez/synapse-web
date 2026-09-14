"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { useSorobanEvents } from "./SorobanProvider";
import { simulateContractCall, stringArg } from "./contract";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { MOCK_TXS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

const PLACEHOLDER_MARKER = "—";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Tolerantly maps a decoded get_transaction() struct onto our Transaction shape. */
function nativeToTransaction(id: string, native: unknown, fallback: Transaction): Transaction {
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
 * transactions the mock data doesn't know about. When a wallet is
 * connected and a real contract is configured, placeholder rows are
 * enriched with full details via a get_transaction() read-only call.
 */
export function useLiveTransactions(): Transaction[] {
  const events = useSorobanEvents();
  const { address } = useWallet();
  const [enriched, setEnriched] = useState<Record<string, Transaction>>({});
  const fetchedIds = useRef<Set<string>>(new Set());

  const baseline = useMemo(() => {
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
  }, [events]);

  useEffect(() => {
    if (!address || !CONTRACT_ID) return;

    const toFetch = baseline.filter(
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
  }, [baseline, address]);

  return useMemo(() => baseline.map((tx) => enriched[tx.id] ?? tx), [baseline, enriched]);
}
