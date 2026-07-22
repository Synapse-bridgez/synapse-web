"use client";
import { memo, type CSSProperties } from "react";
import { Panel } from "@/components/ui/Panel";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { AMBER, BG3, BORDER, DIM } from "@/lib/constants";
import { shortId, elapsed, formatAmount } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface RecentTxTableProps {
  txs: Transaction[];
  onSelect: (tx: Transaction) => void;
}

const HEADERS = ["TX ID", "ASSET", "AMOUNT", "STATUS", "AGE"];
const ROW_STYLE: CSSProperties = {
  cursor: "pointer",
  borderBottom: `1px solid ${BORDER}`,
  transition: "background 0.15s",
};
const CELL_STYLE: CSSProperties = { padding: 8 };
const FLEX_CELL_STYLE: CSSProperties = { display: "flex", alignItems: "center" };
const ID_STYLE: CSSProperties = {
  fontSize: 11,
  color: AMBER,
  fontFamily: "'IBM Plex Mono', monospace",
};
const COPY_BUTTON_STYLE: CSSProperties = { marginLeft: 4 };
const ASSET_STYLE: CSSProperties = {
  ...CELL_STYLE,
  fontSize: 11,
  color: "#ccc",
  fontFamily: "'IBM Plex Mono', monospace",
};
const AMOUNT_STYLE: CSSProperties = { ...ASSET_STYLE, color: "#fff" };
const AGE_STYLE: CSSProperties = { ...ASSET_STYLE, color: DIM };

interface RecentTxRowProps {
  tx: Transaction;
  onSelect: (tx: Transaction) => void;
}

function hasSameRenderedData(previous: RecentTxRowProps, next: RecentTxRowProps) {
  const previousTx = previous.tx;
  const nextTx = next.tx;

  return (
    previous.onSelect === next.onSelect &&
    previousTx.id === nextTx.id &&
    previousTx.asset === nextTx.asset &&
    previousTx.amount === nextTx.amount &&
    previousTx.status === nextTx.status &&
    previousTx.timestamp === nextTx.timestamp
  );
}

const RecentTxRow = memo(function RecentTxRow({ tx, onSelect }: RecentTxRowProps) {
  return (
    <tr
      onClick={() => onSelect(tx)}
      style={ROW_STYLE}
      onMouseEnter={(event) => (event.currentTarget.style.background = BG3)}
      onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
    >
      <td style={CELL_STYLE}>
        <div style={FLEX_CELL_STYLE}>
          <span style={ID_STYLE}>{shortId(tx.id)}</span>
          <CopyButton value={tx.id} label="Tx ID" style={COPY_BUTTON_STYLE} />
        </div>
      </td>
      <td style={ASSET_STYLE}>{tx.asset}</td>
      <td style={AMOUNT_STYLE}>{formatAmount(tx.amount)}</td>
      <td style={CELL_STYLE}>
        <Badge status={tx.status} />
      </td>
      <td style={AGE_STYLE}>{elapsed(tx.timestamp)}</td>
    </tr>
  );
}, hasSameRenderedData);

export function RecentTxTable({ txs, onSelect }: RecentTxTableProps) {
  return (
    <Panel title="RECENT TRANSACTIONS">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                style={{
                  padding: "4px 8px 8px",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: DIM,
                  fontFamily: "'IBM Plex Mono', monospace",
                  textAlign: "left",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txs.map((tx) => (
            <RecentTxRow key={tx.id} tx={tx} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
      <SorobanTip>
        parse TransactionRegistered events from RPC → populate table rows in real-time
      </SorobanTip>
    </Panel>
  );
}
