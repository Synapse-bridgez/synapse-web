"use client";
import { Badge } from "@/components/ui/Badge";
import { AMBER, BG3, BORDER, DIM } from "@/lib/constants";
import { shortId, elapsed } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface TxTableProps {
  txs: Transaction[];
  onSelect: (tx: Transaction) => void;
}

const HEADERS = ["TX ID", "ASSET", "AMOUNT", "FROM", "TO", "STATUS", "RETRIES", "AGE"];

export function TxTable({ txs, onSelect }: TxTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            {HEADERS.map(h => (
              <th key={h} style={{
                padding: "4px 8px 10px", fontSize: 9, letterSpacing: "0.1em",
                color: DIM, fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "left", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap",
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
              <td style={{ padding: "9px 8px", fontSize: 10, color: AMBER, fontFamily: "'IBM Plex Mono', monospace" }}>{shortId(tx.id)}</td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.asset}</td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>{tx.amount.toFixed(1)}</td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: DIM, fontFamily: "'IBM Plex Mono', monospace", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.from.slice(0, 10)}…</td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: DIM, fontFamily: "'IBM Plex Mono', monospace", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.to.slice(0, 10)}…</td>
              <td style={{ padding: "9px 8px" }}><Badge status={tx.status} /></td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: DIM, fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" }}>{tx.retries}</td>
              <td style={{ padding: "9px 8px", fontSize: 10, color: DIM, fontFamily: "'IBM Plex Mono', monospace" }}>{elapsed(tx.timestamp)}</td>
            </tr>
          ))}
          {txs.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: 24, textAlign: "center", color: DIM, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                no transactions match filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
