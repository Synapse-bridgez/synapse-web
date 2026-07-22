"use client";
import { Panel } from "@/components/ui/Panel";
import { STATUS_META, DIM, NEUTRAL } from "@/lib/constants";
import type { Transaction } from "@/lib/types";

interface StatCardsProps {
  txs: Transaction[];
}

export function StatCards({ txs }: StatCardsProps) {
  const counts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  txs.forEach((t) => {
    counts[t.status]++;
  });

  const cards = [
    { label: "TOTAL TXS", value: txs.length, sub: "mock data", color: NEUTRAL },
    {
      label: "PENDING",
      value: counts.PENDING,
      sub: "awaiting pickup",
      color: STATUS_META.PENDING.color,
    },
    {
      label: "COMPLETED",
      value: counts.COMPLETED,
      sub: "settled on-chain",
      color: STATUS_META.COMPLETED.color,
    },
    {
      label: "FAILED",
      value: counts.FAILED,
      sub: "terminal errors",
      color: STATUS_META.FAILED.color,
    },
  ];

  return (
    <div className="stat-cards-grid">
      {cards.map((c) => (
        <Panel key={c.label} accentColor={c.color} style={{ minWidth: 120 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.14em",
              color: DIM,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 8,
            }}
          >
            {c.label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace",
              color: c.color,
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {c.value}
          </div>
          <div style={{ fontSize: 10, color: DIM, fontFamily: "'IBM Plex Mono', monospace" }}>
            {c.sub}
          </div>
        </Panel>
      ))}
    </div>
  );
}
