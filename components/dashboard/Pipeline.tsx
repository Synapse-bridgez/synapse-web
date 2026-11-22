"use client";
import type { Transaction, TxStatus } from "@/lib/types";

interface PipelineProps {
  txs: Transaction[];
}

// shortcut: colors inlined because lib/constants.ts is currently empty; move to STATUS_META once restored
const STAGES: { status: TxStatus; color: string }[] = [
  { status: "PENDING", color: "#f59e0b" },
  { status: "PROCESSING", color: "#3b82f6" },
  { status: "COMPLETED", color: "#10b981" },
  { status: "FAILED", color: "#ef4444" },
];

export function Pipeline({ txs }: PipelineProps) {
  const counts: Record<TxStatus, number> = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  txs.forEach((t) => {
    counts[t.status]++;
  });

  return (
    <div
      role="list"
      aria-label="Transaction status pipeline"
      style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "monospace" }}
    >
      {STAGES.map(({ status, color }) => (
        <div key={status} role="listitem" style={{ color, fontSize: 11 }}>
          <div style={{ letterSpacing: "0.14em" }}>{status}</div>
          <div style={{ fontSize: 9, opacity: 0.7 }}>{counts[status]}</div>
        </div>
      ))}
    </div>
  );
}
