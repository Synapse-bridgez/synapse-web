"use client";
import { useState } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { addressArg, invokeContract, simulateContractCall } from "@/lib/soroban/contract";
import { shortId } from "@/lib/utils";
import { AMBER, BORDER, DIM, MONO, STATUS_META } from "@/lib/constants";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldDef {
  label: string;
  key: string;
  placeholder: string;
}

interface ConfirmConfig {
  title: string;
  message: string;
  /** If set, user must retype this exact value before confirming */
  retypeKey?: string;
  accentColor?: string;
}

/** Diff-style preview of the expected effect of a state-changing call. */
interface PreviewState {
  method: string;
  /** Human-readable diff lines, e.g. "admin: GABC… → GXYZ…" */
  diff: string[];
  /** Estimated fee in stroops, when the simulation reports one. */
  fee?: string;
  /** Raw values captured for the eventual submission. */
  values: Record<string, string>;
}

/** Per-item status for a bulk lifecycle run. */
type BulkItemStatus = "pending" | "signing" | "success" | "failed" | "skipped";

interface BulkItem {
  id: string;
  status: BulkItemStatus;
  /** Human-readable reason for failed/skipped items. */
  message?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortAddr(a: string): string {
  const t = a.trim();
  if (t.length <= 12) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

/**
 * Build a diff-style preview for a known admin method from the submitted
 * field values. Unknown methods fall back to a generic argument listing.
 */
function buildDiff(method: string, values: Record<string, string>): string[] {
  switch (method) {
    case "initialize":
      return [
        `admin: (unset) → ${shortAddr(values.admin ?? "")}`,
        `relay_signer: (unset) → ${shortAddr(values.relay_signer ?? "")}`,
      ];
    case "transfer_admin":
      return [`admin: (current) → ${shortAddr(values.new_admin ?? "")}`];
    case "set_relay_signer":
      return [`relay_signer: (current) → ${shortAddr(values.new_signer ?? "")}`];
    default:
      return Object.entries(values).map(([k, v]) => `${k}: → ${shortAddr(v)}`);
  }
}

/**
 * Determine whether a simulated lifecycle call is still eligible. A call that
 * reverts because the transaction already reached a terminal state (completed
 * or failed by someone else) is treated as ineligible so the bulk loop can
 * skip it with a clear message instead of aborting the whole batch.
 */
function isIneligibleError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("completed") ||
    msg.includes("failed") ||
    msg.includes("invalid state") ||
    msg.includes("not pending")
  );
}

// ---------------------------------------------------------------------------
// AdminCard
// ---------------------------------------------------------------------------

function AdminCard({
  title,
  tip,
  fields,
  onSubmit,
  btnLabel,
  btnColor = AMBER,
  confirm,
}: {
  title: string;
  tip: string;
  fields: FieldDef[];
  onSubmit: (vals: Record<string, string>) => void | Promise<void>;
  btnLabel: string;
  btnColor?: string;
  confirm?: ConfirmConfig;
}) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [pendingVals, setPendingVals] = useState<Record<string, string> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(v: Record<string, string>) {
    setSubmitting(true);
    try {
      await onSubmit(v);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClick() {
    if (confirm) {
      setPendingVals({ ...vals });
    } else {
      submit(vals);
    }
  }

  function handleConfirm() {
    if (pendingVals) submit(pendingVals);
    setPendingVals(null);
  }

  const retypeValue =
    confirm?.retypeKey && pendingVals ? pendingVals[confirm.retypeKey] : undefined;

  return (
    <>
      <Panel title={title}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              value={vals[f.key] ?? ""}
              onChange={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
              placeholder={f.placeholder}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButton
            label={submitting ? "SUBMITTING…" : btnLabel}
            color={btnColor}
            onClick={handleClick}
            disabled={submitting}
          />
        </div>
        <SorobanTip>{tip}</SorobanTip>
      </Panel>

      {pendingVals && confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          retypeValue={retypeValue}
          retypePlaceholder={retypeValue ? `paste or type: ${retypeValue}` : undefined}
          accentColor={confirm.accentColor ?? btnColor}
          onConfirm={handleConfirm}
          onCancel={() => setPendingVals(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PreviewDialog
// ---------------------------------------------------------------------------

function PreviewDialog({
  preview,
  accentColor,
  onConfirm,
  onCancel,
}: {
  preview: PreviewState;
  accentColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0B0E14",
          border: `1px solid ${accentColor}`,
          maxWidth: 520,
          width: "100%",
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: MONO,
            letterSpacing: "0.08em",
            color: accentColor,
            marginBottom: 12,
          }}
        >
          SIMULATION PREVIEW — {preview.method}()
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {preview.diff.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "#E6E6E6",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                padding: "6px 10px",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: DIM,
            marginBottom: 18,
          }}
        >
          estimated fee: {preview.fee ?? "unavailable"}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <ActionButton label="CANCEL" color={DIM} onClick={onCancel} />
          <ActionButton label="CONFIRM & SIGN →" color={accentColor} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------

const BULK_STATUS_META: Record<BulkItemStatus, { label: string; color: string }> = {
  pending: { label: "PENDING", color: DIM },
  signing: { label: "SIGNING…", color: AMBER },
  success: { label: "SUCCESS", color: "#3FB950" },
  failed: { label: "FAILED", color: "#F85149" },
  skipped: { label: "SKIPPED", color: "#D29922" },
};

function BulkActionBar({
  items,
  running,
  onRun,
  onCancel,
  onReset,
}: {
  items: BulkItem[];
  running: boolean;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const done = items.filter((i) => i.status !== "pending" && i.status !== "signing").length;
  const finished = !running && done > 0;

  return (
    <Panel title="BULK LIFECYCLE ACTIONS">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {items.map((item) => {
          const meta = BULK_STATUS_META[item.status];
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontFamily: MONO,
                fontSize: 12,
                border: `1px solid ${BORDER}`,
                padding: "6px 10px",
              }}
            >
              <span style={{ color: "#E6E6E6" }}>{shortId(item.id)}</span>
              <span style={{ color: meta.color, letterSpacing: "0.06em" }}>
                {meta.label}
                {item.message ? ` — ${item.message}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {running ? (
          <ActionButton label="CANCEL BATCH" color={DIM} onClick={onCancel} />
        ) : finished ? (
          <ActionButton label="RESET" color={DIM} onClick={onReset} />
        ) : (
          <ActionButton
            label={`RUN BULK ACTION (${items.length})`}
            color={AMBER}
            onClick={onRun}
            disabled={items.length === 0}
          />
        )}
      </div>
      <SorobanTip>
        Each selected transaction is signed and submitted individually — no signature
        batching. Cancelling mid-batch leaves completed items applied and the rest pending.
      </SorobanTip>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// AdminTab
// ---------------------------------------------------------------------------

export function AdminTab() {
  const { address, connect } = useWallet();
  const { toast } = useToast();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Bulk lifecycle state -----------------------------------------------------
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const cancelRef = useState<{ current: boolean }>(() => ({ current: false }))[0];

  function toggleSelected(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function resetBulk() {
    setSelected([]);
    setBulkItems([]);
  }

  /**
   * Sequentially sign-and-submit the same lifecycle action across every
   * selected transaction. Each item is simulated first so an ineligible
   * transaction (already completed/failed by someone else) is skipped with a
   * clear message rather than aborting the batch. Cancelling mid-batch stops
   * the loop and leaves the remaining items in their pending state.
   */
  async function runBulkAction() {
    if (!address) {
      await connect();
      return;
    }
    const ids = [...selected];
    setBulkItems(ids.map((id) => ({ id, status: "pending" })));
    setBulkRunning(true);
    cancelRef.current = false;

    for (const id of ids) {
      if (cancelRef.current) break;

      setBulkItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "signing" } : it))
      );

      try {
        // Simulate first to detect ineligibility before requesting a signature.
        await simulateContractCall({
          contractId: CONTRACT_ID ?? "",
          method: "fail_transaction",
          args: [addressArg(id)],
          source: address,
        });

        await invokeContract({
          contractId: CONTRACT_ID ?? "",
          method: "fail_transaction",
          args: [addressArg(id)],
          source: address,
        });

        setBulkItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: "success" } : it))
        );
      } catch (err) {
        const ineligible = isIneligibleError(err);
        setBulkItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: ineligible ? "skipped" : "failed",
                  message: ineligible
                    ? "no longer eligible (already completed/failed)"
                    : err instanceof Error
                      ? err.message
                      : "submission failed",
                }
              : it
          )
        );
      }
    }

    setBulkRunning(false);
    toast({ message: "Bulk lifecycle run finished", tone: "info" });
  }

  function cancelBulk() {
    cancelRef.current = true;
    setBulkRunning(false);
  }

  // -------------------------------------------------------------------------

  /**
   * Simulate the state-changing call first. On success, surface a diff-style
   * preview + estimated fee and require explicit confirmation before the real
   * signed submission. On revert, block submission and show the reason.
   */
  async function simulateAndPreview(
    method: string,
    values: Record<string, string>,
    args: unknown[]
  ) {
    if (!address) {
      await connect();
      return;
    }
    setSimulating(true);
    try {
      const sim = await simulateContractCall({
        contractId: CONTRACT_ID ?? "",
        method,
        args,
        source: address,
      });
      const fee =
        sim && typeof sim === "object" && "minResourceFee" in sim
          ? String((sim as { minResourceFee?: unknown }).minResourceFee ?? "")
          : undefined;
      setPreview({
        method,
        diff: buildDiff(method, values),
        fee: fee || undefined,
        values,
      });
    } catch (err) {
      toast({
        message: `Simulation reverted: ${err instanceof Error ? err.message : String(err)}`,
        tone: "error",
      });
    } finally {
      setSimulating(false);
    }
  }

  async function submitPreviewed() {
    if (!preview) return;
    const { method, values } = preview;
    setPreview(null);
    try {
      await invokeContract({
        contractId: CONTRACT_ID ?? "",
        method,
        args: Object.values(values).map((v) => addressArg(v)),
        source: address ?? "",
      });
      toast({ message: `${method} submitted`, tone: "success" });
    } catch (err) {
      toast({
        message: `${method} failed: ${err instanceof Error ? err.message : String(err)}`,
        tone: "error",
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <AdminCard
        title="INITIALIZE"
        tip="Sets the initial admin and relay signer. Can only be called once."
        fields={[
          { label: "Admin address", key: "admin", placeholder: "G…" },
          { label: "Relay signer", key: "relay_signer", placeholder: "G…" },
        ]}
        btnLabel="INITIALIZE"
        confirm={{
          title: "Initialize contract",
          message: "This permanently sets the admin and relay signer.",
        }}
        onSubmit={(vals) =>
          simulateAndPreview("initialize", vals, [
            addressArg(vals.admin),
            addressArg(vals.relay_signer),
          ])
        }
      />

      <AdminCard
        title="TRANSFER ADMIN"
        tip="Transfers admin authority to a new address."
        fields={[{ label: "New admin", key: "new_admin", placeholder: "G…" }]}
        btnLabel="TRANSFER"
        confirm={{
          title: "Transfer admin",
          message: "You will lose admin authority after this call.",
          retypeKey: "new_admin",
        }}
        onSubmit={(vals) =>
          simulateAndPreview("transfer_admin", vals, [addressArg(vals.new_admin)])
        }
      />

      <AdminCard
        title="SET RELAY SIGNER"
        tip="Updates the relay signer authorized to submit lifecycle actions."
        fields={[{ label: "New signer", key: "new_signer", placeholder: "G…" }]}
        btnLabel="UPDATE"
        onSubmit={(vals) =>
          simulateAndPreview("set_relay_signer", vals, [addressArg(vals.new_signer)])
        }
      />

      <Panel title="PENDING TRANSACTIONS">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selected.length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 12, color: DIM }}>
              Select pending transactions below to run a bulk lifecycle action.
            </div>
          )}
          {selected.map((id) => (
            <label
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: MONO,
                fontSize: 12,
                color: "#E6E6E6",
              }}
            >
              <input
                type="checkbox"
                checked
                onChange={() => toggleSelected(id)}
                disabled={bulkRunning}
              />
              {shortId(id)}
            </label>
          ))}
        </div>
      </Panel>

      {bulkItems.length > 0 && (
        <BulkActionBar
          items={bulkItems}
          running={bulkRunning}
          onRun={runBulkAction}
          onCancel={cancelBulk}
          onReset={resetBulk}
        />
      )}

      {preview && (
        <PreviewDialog
          preview={preview}
          accentColor={AMBER}
          onConfirm={submitPreviewed}
          onCancel={() => setPreview(null)}
        />
      )}
    </div>
  );
}
