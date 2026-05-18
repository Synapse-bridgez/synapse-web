export type TxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Transaction {
  id: string;
  asset: string;
  amount: number;
  status: TxStatus;
  timestamp: number;
  from: string;
  to: string;
  memo: string;
  callback_url: string;
  retries: number;
  created_at: number;
}

export interface ContractInfo {
  version: string;
  network: string;
  address: string;
  admin: string;
  relay_signer: string;
  health: string;
}

export interface StatusMeta {
  color: string;
  bg: string;
  glow: string;
  label: string;
}

export interface CallbackPayload {
  tx_id: string;
  callback_url: string;
  secret: string;
}
