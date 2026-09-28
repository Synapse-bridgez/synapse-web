# Synapse Core

A Soroban transaction-lifecycle dashboard built with Next.js 16 and React 19.
Synapse Core lets you inspect, trace, and drive transactions through a Soroban
smart contract deployed on Stellar Testnet — from registration through
completion or failure.

> **Current state: real wallet + contract calls, mock data as fallback.**
> Connect a Freighter or xBull wallet and every action (admin functions, transaction
> lifecycle actions, callback registration, diagnostics) submits a real signed
> transaction or read-only simulation against `NEXT_PUBLIC_CONTRACT_ID`. Without a
> connected wallet or a configured contract, the dashboard and transaction list fall
> back to `lib/mock-data.ts` so the UI is still explorable. A standalone backend relay
> service is still tracked in the open issues below.

---

## What's inside

```
synapse-web/
├── app/
│   ├── layout.tsx          # Root layout — metadata, ToastProvider, global CSS
│   ├── page.tsx            # Entry point — renders <Shell />
│   ├── globals.css         # Base styles, scanline overlay, utility classes
│   └── error.tsx / not-found.tsx
├── components/
│   ├── Shell.tsx           # Top-level shell: header, tab bar, footer
│   ├── dashboard/
│   │   ├── DashboardTab.tsx        # Composes the dashboard view
│   │   ├── StatCards.tsx           # PENDING / PROCESSING / COMPLETED / FAILED counts
│   │   ├── Pipeline.tsx            # Visual pipeline of tx status flow
│   │   ├── ContractInfoPanel.tsx   # Contract address, admin, relay signer, health
│   │   └── RecentTxTable.tsx       # Last-N transactions with click-to-detail
│   ├── transactions/
│   │   ├── TransactionsTab.tsx     # Full transaction list with filters
│   │   ├── TxTable.tsx             # Sortable/paginated tx table
│   │   └── TxDetailModal.tsx       # Overlay with full tx fields
│   ├── admin/
│   │   └── AdminTab.tsx    # initialize / transfer_admin / set_relay_signer / diagnostics
│   ├── docs/
│   │   └── DocsTab.tsx     # ABI reference rendered from lib/constants.ABI_ENDPOINTS
│   └── ui/
│       ├── ActionButton.tsx
│       ├── Badge.tsx
│       ├── ConfirmDialog.tsx
│       ├── CopyButton.tsx
│       ├── Field.tsx
│       ├── Panel.tsx
│       ├── SorobanTip.tsx
│       ├── TabErrorBoundary.tsx
│       └── Toast.tsx
├── lib/
│   ├── mock-data.ts        # Fallback data: MOCK_TXS + MOCK_CONTRACT_INFO
│   ├── types.ts            # Transaction, ContractInfo, TxStatus, CallbackPayload
│   ├── constants.ts        # STATUS_META, colour tokens, ABI_ENDPOINTS
│   ├── utils.ts            # Shared helpers (shortId, elapsed, formatAmount)
│   ├── wallet/
│   │   ├── kit.ts              # StellarWalletsKit init (Freighter + xBull)
│   │   ├── storage.ts          # Selected-wallet-id localStorage helpers
│   │   └── WalletProvider.tsx  # useWallet() context: address/connect/disconnect
│   └── soroban/
│       ├── args.ts               # addressArg/stringArg/structArg ScVal encoders
│       ├── contract.ts           # invokeContract / simulateContractCall
│       ├── events.ts             # RPC event poller (TransactionRegistered/StatusChanged)
│       ├── SorobanProvider.tsx   # useSorobanEvents()/useSorobanHealth() context
│       ├── transactionMerge.ts   # Merges mock baseline with live events
│       ├── useLiveTransactions.ts
│       └── useLiveContractInfo.ts
└── public/                 # Static assets
```

### Mock data as fallback

`lib/mock-data.ts` exports the baseline data every tab renders when no wallet is
connected or `NEXT_PUBLIC_CONTRACT_ID` isn't configured:

| Export               | Used by                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `MOCK_TXS`           | `useLiveTransactions` baseline (stat cards, pipeline, tables)                  |
| `MOCK_CONTRACT_INFO` | `useLiveContractInfo` baseline (address, admin, relay_signer, health, version) |

Once a wallet is connected and a contract is configured, live RPC events and reads
take over — see `lib/soroban/transactionMerge.ts` and `lib/soroban/useLiveContractInfo.ts`.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts on the
**dashboard** tab showing mock data. Connect a Freighter or xBull wallet and set
`NEXT_PUBLIC_CONTRACT_ID` (plus optionally `NEXT_PUBLIC_SOROBAN_RPC_URL`) to switch
to live contract data instead.

Other scripts:

```bash
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run the test suite once
npm run test:watch   # Run the test suite in watch mode
npm run format       # Prettier (writes)
npm run format:check # Prettier (CI check)
npx tsc --noEmit     # Type-check without emitting
```

---

## Security headers & CSP

Every route is served with a strict `Content-Security-Policy` plus
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, and `Strict-Transport-Security` (production only). The
policy is owned and documented in `lib/security/csp.ts` and applied from
`next.config.ts` — see `next.config.ts:13`.

Two things matter for operators:

**The RPC endpoint is build-time.** `connect-src` always allows the origin of
`NEXT_PUBLIC_SOROBAN_RPC_URL` (or the testnet default) plus anything in
`NEXT_PUBLIC_CSP_CONNECT_SRC` (comma-separated origins). Changing the RPC
requires a redeploy, because the header is baked at build time. The policy
_never_ falls back to `connect-src *`; a bad allowlist entry fails the build
instead of producing a policy that silently blocks the app or opens it up.

**Runtime user-supplied RPCs.** If a deployment lets users type an RPC endpoint
at runtime, no static header can know it in advance. Set
`NEXT_PUBLIC_CSP_ALLOW_ANY_HTTPS=1` to allow any `https:` origin in
`connect-src` — still no plaintext HTTP, no `ws:`, and no `data:`. The
long-term fix is a server-side RPC proxy so `connect-src` can stay `'self'`.

Both exceptions the policy keeps — `script-src 'unsafe-inline'` (Next's static
hydration needs it; doing better requires nonces, which force dynamic
rendering) and `style-src 'unsafe-inline'` (React inline styles) — are
documented in `lib/security/csp.ts` rather than left implicit. `script-src-attr
'none'` blocks inline event handlers, and there is no `'unsafe-eval'` anywhere.

Wallet extensions do not appear in `connect-src` by design: Freighter and xBull
are reached via `window.postMessage` and extension-injected APIs, not `fetch`,
so no extension origin is a connect target an injected script could exfiltrate
to. If a future wallet module needs an iframe or a `fetch` call, that must be a
reviewed, explicit policy change — see `lib/security/csp.ts`.

---

## Adding a new tab

1. Create `components/<name>/<Name>Tab.tsx` and export a `<NameTab />` component.
2. Add the tab key to the `TABS` array in `components/Shell.tsx`.
3. Add a matching `{tab === "<name>" && <NameTab />}` render block in `Shell.tsx`.
4. Wrap it in `<TabErrorBoundary>` like the existing tabs.

---

## Roadmap / open issues

Remaining backend and contract-ABI work is tracked in the upstream repo's issue
tracker:

- [Synapse-bridgez/synapse-web — open issues](https://github.com/Synapse-bridgez/synapse-web/issues)

Notable milestones on the path to a working testnet client:

- [x] Replace `alert()` stubs across `AdminTab`, `TxDetailModal`, and `TransactionsTab` with real
      `TransactionBuilder` + sign + submit calls (`lib/soroban/contract.ts`)
- [x] Wire `MOCK_TXS` / `MOCK_CONTRACT_INFO` to live `rpc.Server` reads (`useLiveTransactions`,
      `useLiveContractInfo`), falling back to mock data when no wallet/contract is configured
- [x] Integrate `@creit.tech/stellar-wallets-kit` (Freighter / xBull) for wallet connection
      (`lib/wallet/`)
- [ ] Backend relay service for `register_transaction`, `start_processing`, `complete_transaction`,
      `fail_transaction`, and `register_callback` webhooks
- [ ] Fetch `admin` / `relay_signer` from the deployed contract once it exposes a getter for them
      (currently sourced from `lib/mock-data.ts` / env, since the ABI has none)

---

## Tech stack

|                |                                                  |
| -------------- | ------------------------------------------------ |
| Framework      | Next.js 16 (App Router)                          |
| UI             | React 19, inline styles + Tailwind CSS v4        |
| Font           | IBM Plex Mono                                    |
| Language       | TypeScript 5                                     |
| Linting        | ESLint + Prettier + Husky pre-commit             |
| Testing        | Vitest + Testing Library                         |
| CI             | GitHub Actions (lint → typecheck → test → build) |
| Target network | Stellar Testnet (Soroban)                        |
