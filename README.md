# Synapse Core

A Soroban transaction-lifecycle dashboard built with Next.js 16 and React 19.
Synapse Core lets you inspect, trace, and (eventually) drive transactions through
a Soroban smart contract deployed on Stellar Testnet — from registration through
completion or failure.

> **Current state: static mock, no backend yet.**
> All data is served from `lib/mock-data.ts`. Wallet connection and on-chain calls
> are stubbed with `alert()` placeholders. Real Soroban RPC integration is tracked
> in the open issues below.

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
│   ├── mock-data.ts        # ← mock entry point: MOCK_TXS + MOCK_CONTRACT_INFO
│   ├── types.ts            # Transaction, ContractInfo, TxStatus, CallbackPayload
│   ├── constants.ts        # STATUS_META, colour tokens, ABI_ENDPOINTS
│   └── utils.ts            # Shared helpers (cn, etc.)
└── public/                 # Static assets
```

### Mock-data entry point

`lib/mock-data.ts` exports two objects consumed by every tab:

| Export               | Used by                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `MOCK_TXS`           | DashboardTab, TransactionsTab (stat cards, pipeline, tables)      |
| `MOCK_CONTRACT_INFO` | ContractInfoPanel (address, admin, relay_signer, health, version) |

To add a transaction, append an entry to the `MOCK_TXS` array. Status must be
one of `"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"`.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app starts on the
**dashboard** tab showing mock data.

Other scripts:

```bash
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes)
npm run format:check # Prettier (CI check)
npx tsc --noEmit     # Type-check without emitting
```

---

## Adding a new tab

1. Create `components/<name>/<Name>Tab.tsx` and export a `<NameTab />` component.
2. Add the tab key to the `TABS` array in `components/Shell.tsx`.
3. Add a matching `{tab === "<name>" && <NameTab />}` render block in `Shell.tsx`.
4. Wrap it in `<TabErrorBoundary>` like the existing tabs.

---

## Roadmap / open issues

Real Soroban RPC integration, wallet wiring, and backend work are tracked in the
upstream repo's issue tracker:

- [Synapse-bridgez/synapse-web — open issues](https://github.com/Synapse-bridgez/synapse-web/issues)

Notable milestones on the path to a working testnet client:

- Replace `alert()` stubs in `AdminTab` with real `TransactionBuilder` + sign + submit calls
- Wire `MOCK_TXS` / `MOCK_CONTRACT_INFO` to live `SorobanRpc.Server` reads
- Integrate `@creit-tech/stellar-wallets-kit` (Freighter / xBull) for wallet connection
- Backend relay service for `register_transaction`, `start_processing`, `complete_transaction`,
  `fail_transaction`, and `register_callback` webhooks

---

## Tech stack

|                |                                           |
| -------------- | ----------------------------------------- |
| Framework      | Next.js 16 (App Router)                   |
| UI             | React 19, inline styles + Tailwind CSS v4 |
| Font           | IBM Plex Mono                             |
| Language       | TypeScript 5                              |
| Linting        | ESLint + Prettier + Husky pre-commit      |
| CI             | GitHub Actions (lint → typecheck → build) |
| Target network | Stellar Testnet (Soroban)                 |
