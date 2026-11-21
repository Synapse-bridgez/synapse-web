"use client";
import { AMBER, BORDER, DIM, MONO } from "@/lib/constants";
import type { Transaction } from "@/lib/types";
import { TxTimeline } from "./TxTimeline";

interface TxCompareViewProps {
  txs: Transaction[];
  onClose: () => void;
}

const FIELDS = [
  ["tx_id", "id"],
  ["status", "status"],
  ["asset", "asset"],
  ["amount", "amount"],
  ["memo", "memo"],
  ["callback_url", "callback_url"],
] as const;

const LABEL_COL = 140;
const MIN_COL = 180;

/** Missing, null and empty values all render and compare as "". */
function valueOf(tx: Transaction, key: string): string {
  const v = (tx as unknown as Record<string, unknown>)[key];
  return v == null ? "" : String(v);
}

/** Keys of compared fields where any transaction differs from the first. */
export function diffFields(txs: Transaction[]): Set<string> {
  const diff = new Set<string>();
  if (txs.length < 2) return diff;
  for (const [, key] of FIELDS) {
    const first = valueOf(txs[0]!, key);
    if (txs.some((tx) => valueOf(tx, key) !== first)) diff.add(key);
  }
  return diff;
}

export function TxCompareView({ txs, onClose }: TxCompareViewProps) {
  const diff = diffFields(txs);
  // Two columns fit at 320px as before; 3+ get a minimum width and scroll sideways.
  const scrolls = txs.length > 2;
  const gridTemplateColumns = scrolls
    ? `${LABEL_COL}px repeat(${txs.length}, minmax(${MIN_COL}px, 1fr))`
    : `${LABEL_COL}px repeat(${txs.length}, 1fr)`;
  const row = { display: "grid", gridTemplateColumns, borderBottom: `1px solid ${BORDER}` };
  const cell = { padding: "6px 8px", wordBreak: "break-all" as const };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare transactions"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: "#ddd",
          background: "#0a0a0a",
          border: `1px solid ${BORDER}`,
          maxWidth: "100%",
          maxHeight: "100%",
          overflow: "auto",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: AMBER }}>COMPARE {txs.length} TRANSACTIONS</span>
          <button type="button" onClick={onClose} style={{ fontFamily: MONO }}>
            CLOSE
          </button>
        </div>

        {/* Focusable so keyboard users can scroll the columns with arrow keys. */}
        <div
          role="region"
          aria-label="Transaction comparison table"
          tabIndex={scrolls ? 0 : undefined}
          style={{ overflowX: scrolls ? "auto" : undefined }}
        >
          <div style={{ minWidth: scrolls ? LABEL_COL + txs.length * MIN_COL : undefined }}>
            <div style={{ ...row, color: DIM }}>
              <div style={cell}>FIELD</div>
              {txs.map((tx, i) => (
                <div key={`${tx.id}-${i}`} style={cell} />
              ))}
            </div>
            {FIELDS.map(([label, key]) => (
              <div key={key} style={row}>
                <div style={{ ...cell, color: DIM }}>{label}</div>
                {txs.map((tx, i) => (
                  <div
                    key={`${tx.id}-${i}`}
                    style={{ ...cell, color: diff.has(key) ? AMBER : "#ddd" }}
                  >
                    {valueOf(tx, key) || "—"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(${MIN_COL}px, 1fr))`,
            gap: 12,
            marginTop: 16,
          }}
        >
          {txs.map((tx, i) => (
            <div key={`${tx.id}-${i}`}>
              <div style={{ color: DIM, marginBottom: 4 }}>TIMELINE · {tx.id}</div>
              <TxTimeline events={[{ status: tx.status, timestamp: tx.timestamp }]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TxCompareView;
