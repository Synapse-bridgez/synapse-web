/** One entry in a transaction's status history, as shown on a printed receipt. */
export interface TransactionStatusEntry {
  status: string;
  timestamp?: string | number | null;
  detail?: string | null;
}

/**
 * On-chain view of a transaction used by the printable receipt. Distinct from
 * the ledger-row `Transaction` in `@/lib/types`, which models the contract's
 * stored struct.
 */
export interface Transaction {
  hash: string;
  status: string;
  ledger?: number | string | null;
  sourceAccount?: string | null;
  destination?: string | null;
  amount?: string | number | null;
  asset?: string | null;
  fee?: string | number | null;
  memo?: string | null;
  callbackUrl?: string | null;
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
  statusHistory?: TransactionStatusEntry[];
}

/**
 * Metadata for a deployed Soroban contract, as surfaced by the RPC layer and
 * rendered by the dashboard contract panels.
 *
 * Fields the UI always reads (`id`, `name`, `network`, `abi`) are required so
 * the contract between the RPC layer and the UI is explicit; the fetch layer
 * is responsible for filling defaults. Optional fields are genuinely
 * best-effort metadata that consumers must handle when absent.
 */
export interface ContractInfo {
  /** Contract identifier (C... address). Always present. */
  id: string;
  /** Human-readable contract name. Always present (defaults to the id). */
  name: string;
  /** Network the contract is deployed on. Always present. */
  network: string;
  /** Parsed ABI entries; empty array when the contract exposes none. */
  abi: ContractAbiEntry[];
  /** Optional description shown in the contract info panel. */
  description?: string | null;
  /** Optional deployed-at timestamp. */
  deployedAt?: string | number | null;
  /** Optional source/owner account. */
  sourceAccount?: string | null;
}

/** One entry in a contract's ABI, matching the shape in `docs/contract-abi.md`. */
export interface ContractAbiEntry {
  name: string;
  type?: string;
  inputs?: Array<{ name: string; type: string }>;
  outputs?: Array<{ name?: string; type: string }>;
  doc?: string | null;
}
