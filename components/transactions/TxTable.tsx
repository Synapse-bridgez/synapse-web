"use client";
import { memo, type CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { AMBER, BG3, BORDER, DIM } from "@/lib/constants";
import { shortId, elapsed, formatAmount } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface TxTableProps {
  txs: Transaction[];
  onSelect: (tx: Transaction) => void;
}

const HEADERS = ["TX ID", "ASSET", "AMOUNT", "FROM", "TO", "STATUS", "RETRIES", "AGE"];
const ROW_STYLE: CSSProperties = {
  cursor: "pointer",
  borderBottom: `1px solid ${BORDER}`,
  transition: "background 0.15s",
};
const CELL_STYLE: CSSProperties = { padding: "9px 8px" };
const FLEX_CELL_STYLE: CSSProperties = { display: "flex", alignItems: "center" };
const ID_STYLE: CSSProperties = {
  fontSize: 10,
  color: AMBER,
  fontFamily: "'IBM Plex Mono', monospace",
};
const COPY_BUTTON_STYLE: CSSProperties = { marginLeft: 4 };
const ASSET_STYLE: CSSProperties = {
  ...CELL_STYLE,
  fontSize: 10,
  color: "#ccc",
  fontFamily: "'IBM Plex Mono', monospace",
};
const AMOUNT_STYLE: CSSProperties = { ...ASSET_STYLE, color: "#fff" };
const ADDRESS_STYLE: CSSProperties = { ...ID_STYLE, color: DIM };
const RETRIES_STYLE: CSSProperties = { ...ASSET_STYLE, color: DIM, textAlign: "center" };
const AGE_STYLE: CSSProperties = { ...ASSET_STYLE, color: DIM };

interface TxRowProps {
  tx: Transaction;
  onSelect: (tx: Transaction) => void;
}

function hasSameRenderedData(previous: TxRowProps, next: TxRowProps) {
  const previousTx = previous.tx;
  const nextTx = next.tx;

  return (
    previous.onSelect === next.onSelect &&
    previousTx.id === nextTx.id &&
    previousTx.asset === nextTx.asset &&
    previousTx.amount === nextTx.amount &&
    previousTx.from === nextTx.from &&
    previousTx.to === nextTx.to &&
    previousTx.status === nextTx.status &&
    previousTx.retries === nextTx.retries &&
    previousTx.timestamp === nextTx.timestamp
  );
}

const TxRow = memo(function TxRow({ tx, onSelect }: TxRowProps) {
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
        <div style={FLEX_CELL_STYLE}>
          <span style={ADDRESS_STYLE}>{tx.from.slice(0, 10)}…</span>
          <CopyButton value={tx.from} label="From address" style={COPY_BUTTON_STYLE} />
        </div>
      </td>
      <td style={CELL_STYLE}>
        <div style={FLEX_CELL_STYLE}>
          <span style={ADDRESS_STYLE}>{tx.to.slice(0, 10)}…</span>
          <CopyButton value={tx.to} label="To address" style={COPY_BUTTON_STYLE} />
        </div>
      </td>
      <td style={CELL_STYLE}>
        <Badge status={tx.status} />
      </td>
      <td style={RETRIES_STYLE}>{tx.retries}</td>
      <td style={AGE_STYLE}>{elapsed(tx.timestamp)}</td>
    </tr>
  );
}, hasSameRenderedData);

export function TxTable({ txs, onSelect }: TxTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                style={{
                  padding: "4px 8px 10px",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: DIM,
                  fontFamily: "'IBM Plex Mono', monospace",
                  textAlign: "left",
                  borderBottom: `1px solid ${BORDER}`,
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txs.map((tx) => (
            <TxRow key={tx.id} tx={tx} onSelect={onSelect} />
          ))}
          {txs.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: DIM,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                }}
              >
                no transactions match filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
