"use client";
import { useState } from "react";
import { scValToNative } from "@stellar/stellar-sdk";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { invokeContract, simulateContractCall, stringArg } from "@/lib/soroban/contract";
import { AMBER, BG1, BG2, BORDER, DIM, MONO, STATUS_META } from "@/lib/constants";
import { formatAmount, shortId } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

interface TxDetailModalProps {
  tx: Transaction;
  onClose: () => void;
}

interface PreviewState {
  method: string;
  extraArgs: string[];
  effect: string;
  fee: string;
}

export function TxDetailModal({ tx, onClose }: TxDetailModalProps) {
  const [showFailPrompt, setShowFailPrompt] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [simulating, setSimulating] = useState(false);
  const { address, connect } = useWallet();
  const { toast } = useToast();
  const m = STATUS_META[tx.status];

  function describeEffect(method: string, extraArgs: string[]): string {
    switch (method) {
      case "fail_transaction":
        return `status: \`${tx.status}\` → \`FAILED\` · reason: \`${extraArgs[0] ?? ""}\``;
      case "retry_transaction":
        return `retries: \`${tx.retries}\` → \`${tx.retries + 1}\``;
      case "cancel_transaction":
        return `status: \`${tx.status}\` → \`CANCELLED\``;
      default:
        return `${method}(${shortId(tx.id)}${extraArgs.length ? ", " + extraArgs.join(", ") : ""})`;
    }
  }

  async function requestPreview(method: string, extraArgs: string[] = []) {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet before submitting transactions", "error");
      await connect();
      return;
    }
    setSimulating(true);
    try {
      const args = [stringArg(tx.id), ...extraArgs.map(stringArg)];
      const simulated = await simulateContractCall(RPC_URL, CONTRACT_ID, address, method, args);
      const fee = simulated.result
        ? `${simulated.result.minResourceFee} stroops`
        : "unknown";
      setPreview({ method, extraArgs, effect: describeEffect(method, extraArgs), fee });
    } catch (err) {
      toast(
        `Simulation would revert: ${err instanceof Error ? err.message : `${method}() failed`}`,
        "error"
      );
    } finally {
      setSimulating(false);
    }
  }

  async function confirmPreview() {
    if (!preview) return;
    const { method, extraArgs } = preview;
    setPreview(null);
    await runTxCall(method, extraArgs);
  }

  async function runTxCall(method: string, extraArgs: string[] = []) {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet before submitting transactions", "error");
      await connect();
      return;
    }
    setPendingAction(method);
    try {
      const args = [stringArg(tx.id), ...extraArgs.map(stringArg)];
      const result = await invokeContract(RPC_URL, CONTRACT_ID, address, method, args);
      toast(
        `${method}() ${result.status === "SUCCESS" ? "succeeded" : "failed"} · tx ${shortId(result.hash)}`,
        result.status === "SUCCESS" ? "success" : "error"
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : `${method}() failed`, "error");
    } finally {
      setPendingAction(null);
    }
  }

  async function runIsDuplicate() {
    if (!CONTRACT_ID) {
      toast("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
      return;
    }
    if (!address) {
      toast("Connect a wallet to run this read-only check", "error");
      await connect();
      return;
    }
    setPendingAction("is_duplicate");
    try {
      const simulated = await simulateContractCall(RPC_URL, CONTRACT_ID, address, "is_duplicate", [
        stringArg(tx.id),
      ]);
      const isDuplicate = simulated.result ? scValToNative(simulated.result.retval) : undefined;
      toast(`is_duplicate(${shortId(tx.id)}) → ${JSON.stringify(isDuplicate)}`, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "is_duplicate() failed", "error");
    } finally {
      setPendingAction(null);
    }
  }

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
              fontFamily: MONO,
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
              aria-label="Close"
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
                    fontFamily: MONO,
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
                    fontFamily: MONO,
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

        {/* Simulation preview */}
        {preview && (
          <div
            style={{
              marginBottom: 12,
              padding: 16,
              background: BG2,
              border: `1px solid ${AMBER}44`,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: AMBER,
                fontWeight: 600,
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              SIMULATION PREVIEW
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: "#ddd",
                marginBottom: 6,
                wordBreak: "break-all",
              }}
            >
              {preview.effect}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: DIM,
                marginBottom: 12,
              }}
            >
              estimated fee: {preview.fee}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={pendingAction === preview.method}
                onClick={confirmPreview}
                style={{
                  background: AMBER,
                  border: "none",
                  color: BG1,
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                CONFIRM &amp; SUBMIT
              </button>
              <button
                onClick={() => setPreview(null)}
                style={{
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  color: DIM,
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {showFailPrompt ? (
          <div
            style={{
              marginBottom: 12,
              padding: 16,
              background: BG2,
              border: `1px solid ${STATUS_META.FAILED.color}33`,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: STATUS_META.FAILED.color,
                fontWeight: 600,
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              FAIL TRANSACTION REASON
            </div>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Enter failure reason..."
              style={{
                width: "100%",
                height: 72,
                background: BG1,
                border: `1px solid ${BORDER}`,
                color: "#fff",
                fontFamily: MONO,
                fontSize: 11,
                padding: "8px 10px",
                resize: "none",
                outline: "none",
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={!failReason.trim() || pendingAction === "fail_transaction" || simulating}
                onClick={async () => {
                  const reason = failReason.trim();
                  setShowFailPrompt(false);
                  setFailReason("");
                  await requestPreview("fail_transaction", [reason]);
                }}
                style={{
                  background: STATUS_META.FAILED.color,
                  border: "none",
                  color: "#fff",
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {simulating ? "SIMULATING…" : "PREVIEW FAIL"}
              </button>
              <button
                onClick={() => {
                  setShowFailPrompt(false);
                  setFailReason("");
                }}
                style={{
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  color: DIM,
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionButton
              label="Fail"
              disabled={pendingAction !== null || simulating}
              onClick={() => setShowFailPrompt(true)}
            />
            <ActionButton
              label="Retry"
              disabled={pendingAction !== null || simulating}
              onClick={() => requestPreview("retry_transaction")}
            />
            <ActionButton
              label="Cancel"
              disabled={pendingAction !== null || simulating}
              onClick={() => requestPreview("cancel_transaction")}
            />
            <ActionButton
              label="is_duplicate"
              disabled={pendingAction !== null || simulating}
              onClick={runIsDuplicate}
            />
          </div>
        )}

        <SorobanTip />
      </div>
    </div>
  );
}
