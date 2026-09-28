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
│   ├── wallet/
│   │   └── OriginBadge.tsx # <OriginBadge /> in the header, <SigningOriginNote /> above every signing action
│   ├── onboarding/
│   │   └── GuidedTour.tsx  # First-visit anti-phishing briefing, reopenable from the header
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
│   │   ├── origin.ts           # Origin classification for the anti-phishing badge
│   │   ├── origin.test.ts      # 17 tests over the classifier
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

## Verifying you're on the real dashboard

Wallet-connect phishing — a pixel-perfect clone of this dashboard on a different
host, asking you to sign — is the most common Web3 attack there is. The defenses
against it live mostly in the wallet extension, but this app shows its own origin
so the comparison is possible before you approve anything.

Every wallet connect / sign entry point renders the running origin:

| State        | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `GENUINE`    | The origin exactly matches a published origin, scheme and port included. |
| `LOCAL DEV`  | `localhost` / `127.0.0.1` / `::1`. No signing here is real.              |
| `UNVERIFIED` | Not a published origin — a clone, a fork, or an unknown preview host.    |
| `EMBEDDED`   | Running inside someone else's frame. The address bar is not yours.       |

The badge in the header is the always-visible one; `<SigningOriginNote />` also
appears directly above every sign-triggering action, because that is the moment
the decision is actually made. A first-visit briefing in `<GuidedTour />` (and
the `?` button in the header) covers what to check and how clones get you.

### Configuring the allowlist

A published origin is anything in this list. **An origin that is not on it is
`UNVERIFIED`, not "probably fine"** — the badge is deliberately unforgiving.

| Variable                        | Purpose                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | The operator's published address, e.g. `https://synapse.example.com`.                                       |
| `NEXT_PUBLIC_CANONICAL_ORIGINS` | Extra origins, comma- or space-separated, for a custom domain or alias. Scheme-less hostnames are accepted. |
| `VERCEL_URL`                    | Read automatically from Vercel at build time, so preview deployments are recognised.                        |

Localhost origins classify as `LOCAL DEV` even if they appear in the allowlist:
anything reachable locally is trivially impersonable, so the allowlist is not
allowed to mint a trusted badge for it.

### Iframes

`EMBEDDED` overrides every other state, including a matching `GENUINE` origin,
because a framed page's visible address bar belongs to the attacker. The real
defence is CSP `frame-ancestors 'none'` plus `X-Frame-Options: DENY`; the badge
is the loud fallback if those headers are ever missing. `window.opener` is
deliberately ignored — setting `noopener`/`noreferrer` is the correct response,
and a legitimate `window.open` flow should not be flagged for using it.

### Out of scope

The extensions' own domain binding, which is the check that actually binds a
signature to a site, is not implementable from here. Freighter and xBull both
perform it; the briefing links to their documentation rather than pretending to
replace it.

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
