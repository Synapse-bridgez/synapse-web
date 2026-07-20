"use client";
import { useState } from "react";
import { TxTable } from "./TxTable";
import { TxDetailModal } from "./TxDetailModal";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { ActionButton } from "@/components/ui/ActionButton";
import { AMBER, BG3, BORDER, DIM } from "@/lib/constants";
import { MOCK_TXS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/types";

export function TransactionsTab() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [cb, setCb] = useState({ tx_id: "", callback_url: "", secret: "" });

  const filtered = MOCK_TXS.filter(
    (t) =>
      t.id.includes(filter) ||
      t.status.includes(filter.toUpperCase()) ||
      t.asset.includes(filter.toUpperCase()) ||
      t.memo.includes(filter)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fade-in">
      {selected && <TxDetailModal tx={selected} onClose={() => setSelected(null)} />}

      {/* Lookup */}
      <Panel title="TRANSACTION LOOKUP">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter by tx_id · status · asset · memo…"
            style={{
              flex: 1,
              background: BG3,
              border: `1px solid ${BORDER}`,
              color: "#eee",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              padding: "9px 12px",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(245,166,35,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = BORDER)}
          />
          <button
            onClick={() => alert(`⬡ SOROBAN: get_transaction(tx_id: "${filter}")`)}
            style={{
              padding: "9px 20px",
              background: "transparent",
              border: `1px solid ${AMBER}55`,
              color: AMBER,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            LOOKUP →
          </button>
        </div>
        <SorobanTip>
          get_transaction(tx_id: string) → Transaction struct; read-only simulation, no signing
        </SorobanTip>
      </Panel>

      {/* Full table */}
      <Panel title={`ALL TRANSACTIONS (${filtered.length})`}>
        <TxTable txs={filtered} onSelect={setSelected} />
      </Panel>

      {/* Callback registration */}
      <Panel title="REGISTER CALLBACK">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Field
            label="tx_id"
            value={cb.tx_id}
            onChange={(v) => setCb((p) => ({ ...p, tx_id: v }))}
            placeholder="uuid…"
          />
          <Field
            label="callback_url"
            value={cb.callback_url}
            onChange={(v) => setCb((p) => ({ ...p, callback_url: v }))}
            placeholder="https://…"
          />
          <Field
            label="secret"
            value={cb.secret}
            onChange={(v) => setCb((p) => ({ ...p, secret: v }))}
            placeholder="hmac-secret"
            type="password"
          />
        </div>
        <ActionButton
          label="REGISTER CALLBACK →"
          color={AMBER}
          onClick={() =>
            alert(
              `⬡ SOROBAN: register_callback(payload: CallbackPayload { tx_id: "${cb.tx_id}", callback_url: "${cb.callback_url}", secret: "***" })`
            )
          }
        />
        <SorobanTip>
          register_callback(payload: CallbackPayload) → signed by relay_signer keypair via
          TransactionBuilder
        </SorobanTip>
      </Panel>
    </div>
  );
}
