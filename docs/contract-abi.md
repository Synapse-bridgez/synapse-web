---
title: Contract ABI reference
description: The ContractInfo shape returned by lib/soroban/contract.ts, matching lib/soroban/types.ts.
order: 4
generated: abi-reference
---

<!-- generated:abi-reference -->

## How to read this

This page documents the `ContractInfo` object that
`lib/soroban/contract.ts` returns after parsing a contract's on-chain state.
The authoritative type lives in `lib/soroban/types.ts`; if the two ever
disagree, the type wins.

On-chain reads all go through
`SorobanRpc.Server.simulateTransaction()`. Writes go through
`TransactionBuilder` → sign → `submitTransaction()`. The wallet integration is
`@creit-tech/stellar-wallets-kit` (Freighter / xBull).

## ContractInfo fields

| Field | Type | Optional | Notes |
| --- | --- | --- | --- |
| `address` | `string` | no | The contract ID the info was parsed from. |
| `admin` | `string` | no | Current admin address. |
| `relaySigner` | `string` | no | Account allowed to submit relayed transactions. |
| `paused` | `boolean` | no | Whether the contract is currently paused. |
| `initialized` | `boolean` | no | `false` until the one-time bootstrap has run. |
| `version` | `string` | no | Contract version string reported by the contract. |

## Example

```ts
import type { ContractInfo } from "@/lib/soroban/types";

const info: ContractInfo = {
  address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  admin: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  relaySigner: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  paused: false,
  initialized: true,
  version: "1.0.0",
};
```

## Try them

The reference here is static. To actually invoke these endpoints, run the
dashboard — see [getting started](./getting-started/). The **Admin** tab runs
the `admin` and `one-time` endpoints, the **Transactions** tab runs
`register_callback` and the read-only lookups, and the transaction detail modal
runs the lifecycle transitions.
