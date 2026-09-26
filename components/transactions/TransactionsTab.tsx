"use client";
import { useRef, useState } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { TxTable } from "./TxTable";
import { TxDetailModal } from "./TxDetailModal";
import { BulkActionBar, type BulkItemState } from "./BulkActionBar";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { ActionButton } from "@/components/ui/ActionButton";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { invokeContract, simulateContractCall, stringArg, structArg } from "@/lib/soroban/contract";
import { useLiveTransactions } from "@/lib/soroban/useLiveTransactions";
import { shortId } from "@/lib/utils";
import { AMBER, BG3, BORDER, MONO } from "@/lib/constants";
import type { Transaction } from "@/lib/types";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

const BULK_ACTIONS = ["fail_transaction", "complete_transaction", "cancel_transaction"] as const;
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

export function TransactionsTab() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [cb, setCb] = useState({ tx_id: "", callback_url: "", secret: "" });
  const [lookingUp, setLookingUp] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>(BULK_ACTIONS[0]);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItemState[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const cancelRef = useRef(false);
  const txs = useLiveTransactions();
  const { address, connect } = useWallet();
  const { toast } = useToast();

  async function runLookup() {
    if (!filter.trim()) {
      toast("Enter a tx_id to look up", "error");
      return;
    }
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet to run this read-only lookup", "error");
      await connect();
      return;
    }
    setLookingUp(true);
    try {
      const simulated = await simulateContractCall(
        RPC_URL,
        CONTRACT_ID,
        address,
        "get_transaction",
        [stringArg(filter.trim())]
      );
      const value = simulated.result ? scValToNative(simulated.result.retval) : undefined;
      toast(`get_transaction(${shortId(filter.trim())}) → ${JSON.stringify(value)}`, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "get_transaction() failed", "error");
    } finally {
      setLookingUp(false);
    }
  }

  async function runRegisterCallback() {
    if (!cb.tx_id.trim() || !cb.callback_url.trim() || !cb.secret.trim()) {
      toast("tx_id, callback_url, and secret are all required", "error");
      return;
    }
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet before registering a callback", "error");
      await connect();
      return;
    }
    setRegistering(true);
    try {
      const payload = structArg({
        tx_id: cb.tx_id.trim(),
        callback_url: cb.callback_url.trim(),
        secret: cb.secret.trim(),
      });
      const result = await invokeContract(RPC_URL, CONTRACT_ID, address, "register_callback", [
        payload,
      ]);
      toast(
        `register_callback() ${result.status === "SUCCESS" ? "succeeded" : "failed"} · tx ${shortId(result.hash)}`,
        result.status === "SUCCESS" ? "success" : "error"
      );
      if (result.status === "SUCCESS") {
        setCb({ tx_id: "", callback_url: "", secret: "" });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "register_callback() failed", "error");
    } finally {
      setRegistering(false);
    }
  }

  function toggleBulk(id: string) {
    setBulkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function updateBulkItem(id: string, patch: Partial<BulkItemState>) {
    setBulkItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function runBulk() {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet before running a bulk action", "error");
      await connect();
      return;
    }
    const targets = bulkItems.length
      ? bulkItems.filter((i) => i.status === "pending").map((i) => i.id)
      : bulkIds;
    if (targets.length === 0) {
      toast("Select at least one pending transaction", "error");
      return;
    }
    cancelRef.current = false;
    setBulkRunning(true);
    setBulkItems((prev) => {
      const existing = new Map(prev.map((i) => [i.id, i]));
      return targets.map((id) => existing.get(id) ?? { id, status: "pending" as const });
    });

    for (const id of targets) {
      if (cancelRef.current) {
        updateBulkItem(id, { status: "skipped", message: "batch cancelled" });
        continue;
      }
      const live = txs.find((t) => t.id === id);
      if (live && TERMINAL_STATUSES.includes(live.status)) {
        updateBulkItem(id, {
          status: "skipped",
          message: `already ${live.status.toLowerCase()} by another signer`,
        });
        continue;
      }
      updateBulkItem(id, { status: "signing", message: "awaiting wallet signature" });
      try {
        const result = await invokeContract(RPC_URL, CONTRACT_ID, address, bulkAction, [
          stringArg(id),
        ]);
        if (result.status === "SUCCESS") {
          updateBulkItem(id, { status: "success", message: shortId(result.hash) });
        } else {
          updateBulkItem(id, { status: "failed", message: "submission failed" });
        }
      } catch (err) {
        updateBulkItem(id, {
          status: "failed",
          message: err instanceof Error ? err.message : "signing rejected",
        });
      }
    }

    setBulkRunning(false);
    setBulkIds([]);
    toast(`Bulk ${bulkAction} finished`, "info");
  }

  const filtered = txs.filter(
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
              fontFamily: MONO,
              fontSize: 12,
              padding: "9px 12px",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(245,166,35,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = BORDER)}
          />
          <button
            onClick={runLookup}
            disabled={lookingUp}
            style={{
              padding: "9px 20px",
              background: "transparent",
              border: `1px solid ${AMBER}55`,
              color: AMBER,
              fontFamily: MONO,
              fontSize: 11,
              cursor: lookingUp ? "wait" : "pointer",
              opacity: lookingUp ? 0.6 : 1,
              letterSpacing: "0.06em",
            }}
          >
            {lookingUp ? "LOOKING UP…" : "LOOKUP →"}
          </button>
        </div>
        <SorobanTip>
          get_transaction(tx_id: string) → Transaction struct; read-only simulation, no signing
        </SorobanTip>
      </Panel>

      {/* Bulk lifecycle actions */}
      <Panel title="BULK LIFECYCLE ACTIONS">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#888" }}>ACTION</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            disabled={bulkRunning}
            style={{
              background: BG3,
              border: `1px solid ${BORDER}`,
              color: AMBER,
              fontFamily: MONO,
              fontSize: 11,
              padding: "7px 10px",
              outline: "none",
            }}
          >
            {BULK_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#888" }}>
            {bulkIds.length} selected · each item requires its own signature
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {filtered.map((t) => (
            <label
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11 }}
            >
              <input
                type="checkbox"
                checked={bulkIds.includes(t.id)}
                disabled={bulkRunning || TERMINAL_STATUSES.includes(t.status)}
                onChange={() => toggleBulk(t.id)}
              />
              <span style={{ color: "#ccc" }}>{t.id}</span>
              <span style={{ color: "#888" }}>· {t.status}</span>
            </label>
          ))}
        </div>
        <BulkActionBar
          action={bulkAction}
          items={bulkItems}
          running={bulkRunning}
          onRun={runBulk}
          onCancel={() => {
            cancelRef.current = true;
          }}
          onClear={() => {
            setBulkItems([]);
            setBulkIds([]);
          }}
        />
        <SorobanTip>
          Sequential signing loop — {bulkAction}(tx_id: string) invoked once per selected transaction
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
          label={registering ? "SUBMITTING…" : "REGISTER CALLBACK →"}
          color={AMBER}
          disabled={registering}
          onClick={runRegisterCallback}
        />
        <SorobanTip>
          register_callback(payload: CallbackPayload) → signed by relay_signer keypair via
          TransactionBuilder
        </SorobanTip>
      </Panel>
    </div>
  );
}
