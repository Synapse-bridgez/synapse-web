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
 * The network passphrase this dashboard is configured to target.
 *
 * Used by the wallet layer to detect a mismatch between the connected
 * wallet's active network and the dashboard's configured network before
 * allowing a submission. Defaults to Testnet; override via
 * `NEXT_PUBLIC_NETWORK_PASSPHRASE` for other deployments.
 */
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

/** Human-readable label for the configured network, derived from the passphrase. */
export const NETWORK_LABEL = NETWORK_PASSPHRASE.includes("Test")
  ? "Testnet"
  : NETWORK_PASSPHRASE.includes("Public")
    ? "Mainnet"
    : "Custom Network";

/**
 * Idle-session timeout configuration for connected wallet sessions.
 *
 * A wallet left connected on a shared or unattended machine is a security
 * exposure, so the wallet layer auto-disconnects after a period of user
 * inactivity. `IDLE_TIMEOUT_MS` is the total inactivity window before the
 * session is reset; `IDLE_WARNING_MS` is how long before expiry the warning
 * prompt (with a "stay connected" option) is shown. Both are overridable via
 * environment variables for deployments that need a different policy.
 */
export const IDLE_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS ?? 15 * 60 * 1000,
);

export const IDLE_WARNING_MS = Number(
  process.env.NEXT_PUBLIC_IDLE_WARNING_MS ?? 60 * 1000,
);

/**
 * Priority-ordered list of Soroban RPC endpoints used for client-side
 * selection and failover.
 *
 * The first entry is the preferred endpoint. `NEXT_PUBLIC_SOROBAN_RPC_URL`
 * remains the primary configuration knob; additional endpoints can be
 * supplied as a comma-separated list via `NEXT_PUBLIC_SOROBAN_RPC_URLS`
 * (highest priority first). Duplicates are removed while preserving order so
 * the same endpoint is never health-checked or selected twice.
 */
export const SOROBAN_RPC_URLS: string[] = (() => {
  const primary = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  const extra = (process.env.NEXT_PUBLIC_SOROBAN_RPC_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const ordered = [primary, ...extra].filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );

  return Array.from(new Set(ordered));
})();

/**
 * Client-side failover tuning.
 *
 * `RPC_HEALTH_CHECK_INTERVAL_MS` is how often healthy endpoints are
 * re-probed in the background. `RPC_FAILURE_THRESHOLD` is the number of
 * consecutive failures before an endpoint's circuit opens. `RPC_COOLDOWN_MS`
 * is the hysteresis window an endpoint stays out of rotation after opening,
 * preventing rapid flapping on transient errors. `RPC_HEALTH_TIMEOUT_MS`
 * bounds each probe so a blackholed endpoint cannot stall selection.
 */
export const RPC_HEALTH_CHECK_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_RPC_HEALTH_CHECK_INTERVAL_MS ?? 30 * 1000,
);

export const RPC_FAILURE_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_RPC_FAILURE_THRESHOLD ?? 2,
);

export const RPC_COOLDOWN_MS = Number(
  process.env.NEXT_PUBLIC_RPC_COOLDOWN_MS ?? 60 * 1000,
);

export const RPC_HEALTH_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_RPC_HEALTH_TIMEOUT_MS ?? 5 * 1000,
);

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
