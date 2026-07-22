"use client";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { CopyButton } from "@/components/ui/CopyButton";
import { STATUS_META, AMBER, BG1, BORDER, DIM } from "@/lib/constants";
import { formatAmount } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface TxDetailModalProps {
  tx: Transaction;
  onClose: () => void;
}

export function TxDetailModal({ tx, onClose }: TxDetailModalProps) {
  const m = STATUS_META[tx.status];

  const fields: [string, string][] = [
    ["id", tx.id],
    ["asset", tx.asset],
    ["amount", `${formatAmount(tx.amount)} USDC`],
    ["from", tx.from],
    ["to", tx.to],
    ["memo", tx.memo],
    ["callback_url", tx.callback_url],
    ["retries", String(tx.retries)],
    ["created_at", new Date(tx.created_at).toISOString()],
    ["status", tx.status],
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
        style={{
          background: BG1,
          border: `1px solid ${m.color}44`,
          width: 560,
          maxHeight: "82vh",
          overflowY: "auto",
          padding: 24,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: AMBER,
              letterSpacing: "0.1em",
            }}
          >
            TX DETAIL
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge status={tx.status} />
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: DIM,
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Fields */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <tbody>
            {fields.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td
                  style={{
                    padding: "6px 0",
                    fontSize: 10,
                    color: DIM,
                    fontFamily: "'IBM Plex Mono', monospace",
                    width: "28%",
                    verticalAlign: "top",
                  }}
                >
                  {k}
                </td>
                <td
                  style={{
                    padding: "6px 0 6px 8px",
                    fontSize: 10,
                    color: "#ddd",
                    fontFamily: "'IBM Plex Mono', monospace",
                    wordBreak: "break-all",
                  }}
                >
                  <span style={{ verticalAlign: "middle" }}>{v}</span>
                  {(k === "id" || k === "from" || k === "to") && (
                    <CopyButton
                      value={v}
                      label={k === "id" ? "Tx ID" : k === "from" ? "From address" : "To address"}
                      style={{ marginLeft: 6, verticalAlign: "middle" }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <ActionButton
            label="START PROCESSING"
            color={STATUS_META.PROCESSING.color}
            onClick={() => alert(`⬡ SOROBAN: start_processing(tx_id: "${tx.id}")`)}
          />
          <ActionButton
            label="COMPLETE"
            color={STATUS_META.COMPLETED.color}
            onClick={() => alert(`⬡ SOROBAN: complete_transaction(tx_id: "${tx.id}")`)}
          />
          <ActionButton
            label="FAIL"
            color={STATUS_META.FAILED.color}
            onClick={() => alert(`⬡ SOROBAN: fail_transaction(tx_id: "${tx.id}", reason: "…")`)}
          />
          <ActionButton
            label="DUPLICATE?"
            color={AMBER}
            onClick={() => alert(`⬡ SOROBAN: is_duplicate(tx_id: "${tx.id}")`)}
          />
        </div>

        <SorobanTip>
          get_transaction(tx_id) → full Transaction struct; actions require relay_signer signing
        </SorobanTip>
      </div>
    </div>
  );
}
