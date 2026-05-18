"use client";
import { Panel } from "@/components/ui/Panel";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { Badge } from "@/components/ui/Badge";
import { AMBER, BG3, BORDER, DIM } from "@/lib/constants";
import { shortId, elapsed } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface RecentTxTableProps {
  txs: Transaction[];
  onSelect: (tx: Transaction) => void;
}

const HEADERS = ["TX ID", "ASSET", "AMOUNT", "STATUS", "AGE"];

export function RecentTxTable({ txs, onSelect }: RecentTxTableProps) {
  return (
    <Panel title="RECENT TRANSACTIONS">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {HEADERS.map(h => (
              <th key={h} style={{
                padding: "4px 8px 8px", fontSize: 9, letterSpacing: "0.1em",
                color: DIM, fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "left", borderBottom: `1px solid ${BORDER}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txs.map(tx => (
            <tr
              key={tx.id}
              onClick={() => onSelect(tx)}
              style={{ cursor: "pointer", borderBottom: `1px solid ${BORDER}`, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = BG3)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "8px", fontSize: 11, color: AMBER, fontFamily: "'IBM Plex Mono', monospace" }}>{shortId(tx.id)}</td>
              <td style={{ padding: "8px", fontSize: 11, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.asset}</td>
              <td style={{ padding: "8px", fontSize: 11, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.amount.toFixed(1)}</td>
              <td style={{ padding: "8px" }}><Badge status={tx.status} /></td>
              <td style={{ padding: "8px", fontSize: 11, color: DIM, fontFamily: "'IBM Plex Mono', monospace" }}>{elapsed(tx.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SorobanTip>parse TransactionRegistered events from RPC → populate table rows in real-time</SorobanTip>
    </Panel>
  );
}
