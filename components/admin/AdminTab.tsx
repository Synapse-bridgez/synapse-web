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
// AdminTab
// ---------------------------------------------------------------------------

export function AdminTab() {
  const { address, connect } = useWallet();
  const { toast } = useToast();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [simulating, setSimulating] = useState(false);

  /**
   * Simulate the state-changing call first. On success, surface a diff-style
   * preview + estimated fee and require explicit confirmation before the real
   * signed submission. On revert, block submission and show the reason.
   */
  async function runAdminCall(
    method: string,
    addresses: string[],
    values: Record<string, string>,
    accentColor: string = AMBER
  ) {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet before submitting admin transactions", "error");
      await connect();
      return;
    }
    if (addresses.some((a) => !a.trim())) {
      toast("All address fields are required", "error");
      return;
    }

    const args = addresses.map(addressArg);

    // 1. Simulate first — never sign without a successful simulation.
    setSimulating(true);
    try {
      const simulated = await simulateContractCall(RPC_URL, CONTRACT_ID, address, method, args);
      const fee =
        simulated.fee !== undefined && simulated.fee !== null
          ? `${simulated.fee} stroops`
          : undefined;
      setPreview({
        method,
        diff: buildDiff(method, values),
        fee,
        values,
      });
    } catch (err) {
      // Would-revert: block submission and surface the revert reason.
      toast(
        `Simulation failed — submission blocked: ${err instanceof Error ? err.message : `${method}() would revert`}`,
        "error"
      );
    } finally {
      setSimulating(false);
    }
  }

  /** Triggered only after the user explicitly confirms the preview. */
  async function submitConfirmed(p: PreviewState) {
    if (!CONTRACT_ID || !address) return;
    const args = Object.values(p.values).map(addressArg);
    try {
      const result = await invokeContract(RPC_URL, CONTRACT_ID, address, p.method, args);
      toast(
        `${p.method}() ${result.status === "SUCCESS" ? "succeeded" : "failed"} · tx ${shortId(result.hash)}`,
        result.status === "SUCCESS" ? "success" : "error"
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : `${p.method}() failed`, "error");
    }
  }

  async function runDiagnostic(method: string) {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet to run read-only diagnostics", "error");
      await connect();
      return;
    }
    try {
      const simulated = await simulateContractCall(RPC_URL, CONTRACT_ID, address, method);
      const value = simulated.result ? scValToNative(simulated.result.retval) : undefined;
      toast(`${method}() → ${JSON.stringify(value)}`, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : `${method}() failed`, "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fade-in">
      {/* Warning banner */}
      <div
        style={{
          background: "rgba(239,83,80,0.06)",
          border: "1px solid rgba(239,83,80,0.3)",
          padding: "10px 16px",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#EF5350",
            fontFamily: MONO,
            letterSpacing: "0.06em",
          }}
        >
          ⚠ PRIVILEGED ZONE — all operations here require admin keypair authorization
        </span>
      </div>

      {/* Initialize */}
      <AdminCard
        title="INITIALIZE CONTRACT"
        tip="initialize(admin: Address, relay_signer: Address) — one-time bootstrap; reverts if already initialized"
        fields={[
          { label: "admin", key: "admin", placeholder: "G… admin address" },
          { label: "relay_signer", key: "relay_signer", placeholder: "G… relay signer address" },
        ]}
        btnLabel={simulating ? "SIMULATING…" : "INITIALIZE →"}
        onSubmit={(v) => runAdminCall("initialize", [v.admin ?? "", v.relay_signer ?? ""], v)}
      />

      {/* Transfer admin — requires retype confirmation */}
      <AdminCard
        title="TRANSFER ADMIN"
        tip="transfer_admin(new_admin: Address) — caller must be current admin; irreversible if wrong address"
        fields={[{ label: "new_admin", key: "new_admin", placeholder: "G… new admin address" }]}
        btnLabel={simulating ? "SIMULATING…" : "TRANSFER →"}
        btnColor={STATUS_META.FAILED.color}
        confirm={{
          title: "TRANSFER ADMIN — IRREVERSIBLE",
          message:
            "You are transferring admin rights to a new address. " +
            "If the address is wrong you will permanently lose access to all admin functions. " +
            "Retype the destination address exactly to continue.",
          retypeKey: "new_admin",
          accentColor: STATUS_META.FAILED.color,
        }}
        onSubmit={(v) =>
          runAdminCall("transfer_admin", [v.new_admin ?? ""], v, STATUS_META.FAILED.color)
        }
      />

      {/* Set relay signer — gated confirm (no retype required) */}
      <AdminCard
        title="SET RELAY SIGNER"
        tip="set_relay_signer(new_signer: Address) — caller must be current admin"
        fields={[
          { label: "new_signer", key: "new_signer", placeholder: "G… new relay signer address" },
        ]}
        btnLabel={simulating ? "SIMULATING…" : "SET SIGNER →"}
        btnColor={STATUS_META.PROCESSING.color}
        confirm={{
          title: "SET RELAY SIGNER",
          message:
            "You are updating the relay signer. Confirm the new signer address before continuing.",
          accentColor: STATUS_META.PROCESSING.color,
        }}
        onSubmit={(v) =>
          runAdminCall("set_relay_signer", [v.new_signer ?? ""], v, STATUS_META.PROCESSING.color)
        }
      />

      {preview && (
        <PreviewDialog
          preview={preview}
          accentColor={AMBER}
          onConfirm={() => {
            const p = preview;
            setPreview(null);
            void submitConfirmed(p);
          }}
          onCancel={() => setPreview(null)}
        />
      )}
    </div>
  );
}
