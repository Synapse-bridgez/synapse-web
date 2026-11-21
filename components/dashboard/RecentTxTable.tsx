"use client";
import { TxTable } from "@/components/transactions/TxTable";
import type { Transaction } from "@/lib/types";

const DEFAULT_LIMIT = 5;

interface RecentTxTableProps {
  txs: Transaction[];
  onSelect: (tx: Transaction) => void;
  limit?: number;
}

// Assumes txs are ordered newest-first.
export function RecentTxTable({ txs, onSelect, limit = DEFAULT_LIMIT }: RecentTxTableProps) {
  return <TxTable txs={txs.slice(0, limit)} onSelect={onSelect} />;
}
