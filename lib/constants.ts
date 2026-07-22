import type { StatusMeta, TxStatus } from "./types";

export const STATUS_META: Record<TxStatus, StatusMeta> = {
  PENDING: {
    color: "#F5A623",
    bg: "rgba(245,166,35,0.12)",
    glow: "rgba(245,166,35,0.4)",
    label: "PENDING",
  },
  PROCESSING: {
    color: "#4FC3F7",
    bg: "rgba(79,195,247,0.12)",
    glow: "rgba(79,195,247,0.4)",
    label: "PROCESSING",
  },
  COMPLETED: {
    color: "#66BB6A",
    bg: "rgba(102,187,106,0.12)",
    glow: "rgba(102,187,106,0.4)",
    label: "COMPLETED",
  },
  FAILED: {
    color: "#EF5350",
    bg: "rgba(239,83,80,0.12)",
    glow: "rgba(239,83,80,0.4)",
    label: "FAILED",
  },
};

export const AMBER = "#F5A623";
export const NEUTRAL = "#fff";
export const BG0 = "#0A0B0D";
export const BG1 = "#0F1115";
export const BG2 = "#14171D";
export const BG3 = "#1A1E26";
export const BORDER = "rgba(245,166,35,0.15)";
export const DIM = "rgba(255,255,255,0.35)";

export const ABI_ENDPOINTS = [
  {
    name: "initialize",
    sig: "initialize(admin: Address, relay_signer: Address)",
    access: "one-time",
    desc: "Bootstrap the contract. Fails if already initialized. One-time call only.",
  },
  {
    name: "register_transaction",
    sig: "register_transaction(payload: TxPayload) → tx_id: String",
    access: "relay_signer",
    desc: "Register a new transaction. Returns a UUID. Emits TransactionRegistered event.",
  },
  {
    name: "start_processing",
    sig: "start_processing(tx_id: String)",
    access: "relay_signer",
    desc: "Advance transaction PENDING → PROCESSING. Emits StatusChanged.",
  },
  {
    name: "complete_transaction",
    sig: "complete_transaction(tx_id: String)",
    access: "relay_signer",
    desc: "Advance PROCESSING → COMPLETED. Emits StatusChanged + triggers callback.",
  },
  {
    name: "fail_transaction",
    sig: "fail_transaction(tx_id: String, reason: String)",
    access: "relay_signer",
    desc: "Mark transaction as FAILED with a reason string. Emits StatusChanged.",
  },
  {
    name: "get_transaction",
    sig: "get_transaction(tx_id: String) → Transaction",
    access: "public",
    desc: "Read-only simulation. Returns full Transaction struct from ledger storage.",
  },
  {
    name: "is_duplicate",
    sig: "is_duplicate(tx_id: String) → bool",
    access: "public",
    desc: "Check whether a tx_id has already been registered. Safe read-only call.",
  },
  {
    name: "register_callback",
    sig: "register_callback(payload: CallbackPayload)",
    access: "relay_signer",
    desc: "Register a webhook URL for a transaction lifecycle event notification.",
  },
  {
    name: "transfer_admin",
    sig: "transfer_admin(new_admin: Address)",
    access: "admin",
    desc: "Transfer admin rights. Caller must be the current admin address.",
  },
  {
    name: "set_relay_signer",
    sig: "set_relay_signer(new_signer: Address)",
    access: "admin",
    desc: "Replace the relay signer address. Caller must be the current admin.",
  },
  {
    name: "health",
    sig: "health() → String",
    access: "public",
    desc: "Returns contract health string. No signing required.",
  },
  {
    name: "version",
    sig: "version() → String",
    access: "public",
    desc: "Returns contract semver string e.g. '0.1.0'.",
  },
];
