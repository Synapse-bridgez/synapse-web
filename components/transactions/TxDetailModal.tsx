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
import type { Transaction, TxStatus } from "@/lib/types";
import { TxReceiptPrintView } from "./TxReceiptPrintView";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID;

// Optimistic lifecycle transitions: the status we expect the poller to observe
// once the submitted write action is confirmed on-chain.
const OPTIMISTIC_STATUS: Record<string, TxStatus> = {
  start_processing: "PROCESSING",
  complete_transaction: "COMPLETED",
  fail_transaction: "FAILED",
};

interface TxDetailModalProps {
  tx: Transaction;
  onClose: () => void;
}

export function TxDetailModal({ tx, onClose }: TxDetailModalProps) {
  const [showFailPrompt, setShowFailPrompt] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  // Optimistic overlay: locally-pending status shown immediately on submission,
  // reconciled with the poller-observed tx.status once it catches up.
  const [optimisticStatus, setOptimisticStatus] = useState<TxStatus | null>(null);
  const [optimisticError, setOptimisticError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const { address, connect } = useWallet();
  const { toast } = useToast();

  // Reconcile: once the poller-observed status matches the optimistic target,
  // drop the overlay so the confirmed state takes over.
  const reconciled = optimisticStatus !== null && tx.status === optimisticStatus;
  const displayStatus = reconciled ? tx.status : optimisticStatus ?? tx.status;
  const m = STATUS_META[displayStatus];

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
    const optimistic = OPTIMISTIC_STATUS[method];
    setPendingAction(method);
    setOptimisticError(null);
    if (optimistic) setOptimisticStatus(optimistic);
    try {
      const args = [stringArg(tx.id), ...extraArgs.map(stringArg)];
      const result = await invokeContract(RPC_URL, CONTRACT_ID, address, method, args);
      if (result.status === "SUCCESS") {
        toast(`${method}() succeeded · tx ${shortId(result.hash)}`, "success");
      } else {
        // Submission failed/reverted: roll back the optimistic overlay.
        setOptimisticStatus(null);
        setOptimisticError(`${method}() failed on-chain`);
        toast(`${method}() failed · tx ${shortId(result.hash)}`, "error");
      }
    } catch (err) {
      // Submission threw: roll back the optimistic overlay with a clear error.
      setOptimisticStatus(null);
      setOptimisticError(err instanceof Error ? err.message : `${method}() failed`);
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
    ["status", displayStatus],
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
            <Badge status={displayStatus} />
            {optimisticStatus !== null && !reconciled && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: AMBER,
                  letterSpacing: "0.08em",
                }}
              >
                PENDING CONFIRMATION
              </span>
            )}
            <button
              onClick={() => setShowReceipt(true)}
              aria-label="Print receipt"
              title="Print receipt"
              style={{
                background: "none",
                border: `1px solid ${BORDER}`,
                color: DIM,
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.08em",
                padding: "3px 8px",
              }}
            >
              RECEIPT
            </button>
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

        {optimisticError && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              background: BG2,
              border: `1px solid ${STATUS_META.FAILED.color}55`,
              color: STATUS_META.FAILED.color,
              fontFamily: MONO,
              fontSize: 10,
            }}
          >
            ⚠ {optimisticError} — reverted to confirmed state
          </div>
        )}

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
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showReceipt && (
          <TxReceiptPrintView
            tx={tx}
            displayStatus={displayStatus}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </div>
    </div>
  );
}
