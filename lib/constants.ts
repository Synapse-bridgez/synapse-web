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

/**
 * The app's monospace stack.
 *
 * The variable is defined by `next/font` in `app/layout.tsx`, which self-hosts
 * the face and generates its own family name — so the literal string
 * "IBM Plex Mono" no longer resolves to anything and must not be used.
 *
 * Form controls do not inherit `font-family` from `body`, so buttons, inputs
 * and selects still need this applied explicitly rather than relying on the
 * cascade.
 */
export const MONO = "var(--font-ibm-plex-mono), monospace";

/**
 * Predefined Soroban RPC environments offered by the network switcher.
 *
 * `passphrase` is the network passphrase the endpoint is expected to report
 * via `getNetwork`. It is used to detect a passphrase mismatch when a user
 * validates a custom endpoint, so the two must stay in sync with the
 * predefined switcher options.
 */
export const SOROBAN_NETWORKS = [
  {
    id: "testnet",
    label: "Testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
  },
  {
    id: "futurenet",
    label: "Futurenet",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    passphrase: "Test SDF Future Network ; October 2022",
  },
] as const;

export type SorobanNetworkId = (typeof SOROBAN_NETWORKS)[number]["id"];

/**
 * Storage key for a user-supplied custom Soroban RPC endpoint. The value is
 * only written after a successful connectivity/compatibility validation.
 */
export const CUSTOM_RPC_STORAGE_KEY = "soroban.customRpcEndpoint";

/**
 * The RPC method used as a lightweight health-check before a custom endpoint
 * is persisted or activated. `getHealth` is the Soroban RPC equivalent of a
 * liveness probe and requires no signing.
 */
export const RPC_HEALTH_METHOD = "getHealth";

/**
 * The RPC method used to read the endpoint's network passphrase so a custom
 * endpoint can be rejected when it does not match the expected network.
 */
export const RPC_NETWORK_METHOD = "getNetwork";

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
