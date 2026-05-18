import type { Transaction, ContractInfo } from "./types";

export const MOCK_CONTRACT_INFO: ContractInfo = {
  version: "0.1.0 (mock)",
  network: "testnet",
  address: "CSYNAPSE_CORE01XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  admin: "GADM_INXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  relay_signer: "GRLY_SGNRXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  health: "unknown",
};

const now = Date.now();

export const MOCK_TXS: Transaction[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    asset: "USDC",
    amount: 5.0,
    status: "PENDING",
    timestamp: now - 12000,
    from: "GADDR1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    to: "GADDR2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    memo: "payment-ref-001",
    callback_url: "https://api.example.com/cb/001",
    retries: 0,
    created_at: now - 12000,
  },
  {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    asset: "USDC",
    amount: 12.0,
    status: "PROCESSING",
    timestamp: now - 60000,
    from: "GADDR3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    to: "GADDR4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    memo: "payment-ref-002",
    callback_url: "https://api.example.com/cb/002",
    retries: 1,
    created_at: now - 60000,
  },
  {
    id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    asset: "USDC",
    amount: 20.0,
    status: "COMPLETED",
    timestamp: now - 300000,
    from: "GADDR5XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    to: "GADDR6XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    memo: "payment-ref-003",
    callback_url: "https://api.example.com/cb/003",
    retries: 0,
    created_at: now - 300000,
  },
  {
    id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    asset: "USDC",
    amount: 3.0,
    status: "FAILED",
    timestamp: now - 900000,
    from: "GADDR7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    to: "GADDR8XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    memo: "payment-ref-004",
    callback_url: "https://api.example.com/cb/004",
    retries: 3,
    created_at: now - 900000,
  },
];
