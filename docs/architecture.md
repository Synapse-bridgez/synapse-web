---
title: Architecture
description: How the app is put together — data flow, the mock fallback, and where the ABI reference lives.
order: 3
---

Next.js 16 App Router, no backend. Everything interesting happens in the
browser, against Stellar Testnet.

Each tab is its own route. `lib/tabs.ts` is the source of truth for the tab
list: `TABS` holds `dashboard`, `transactions`, `admin` and `docs`,
`DEFAULT_TAB` is `dashboard`, `tabPath()` returns `/<tab>`, and
`tabFromPathname()` maps a pathname back to a tab, falling back to
`DEFAULT_TAB` for `/`, unknown names and paths deeper than one segment.

`app/[tab]/page.tsx` is the dynamic segment. `generateStaticParams()` returns
one `{ tab }` per entry in `TABS`, so each tab is prerendered, and
`dynamicParams = false` makes any other segment a 404. `app/page.tsx` also
renders `<Shell />` for `/`, which shows the default tab.

`components/Shell.tsx` builds its tab bar from `TABS`, passed through
`visibleTabs()` and `resolveActiveTab()` in `lib/flags/definitions.ts`. A tab
whose flag is off is removed from the bar, and an open tab that gets switched
off falls back to the first visible tab. Selecting a tab calls
`window.history.pushState()` with `tabPath()` instead of navigating, and a
`popstate` listener follows back and forward. Only the active tab's panel is
rendered in the body.

## Directory map

```text
app/
  layout.tsx        Root layout: metadata, self-hosted font, provider stack
  page.tsx          Renders <Shell /> at `/` (default tab)
  [tab]/page.tsx    One static page per tab; unknown segments 404
  globals.css       Design tokens and layout classes
components/
  Shell.tsx         Header, tab bar, body, footer
  dashboard/        StatCards, Pipeline, ContractInfoPanel, RecentTxTable
  transactions/     TransactionsTab, TxTable, TxDetailModal
  admin/            AdminTab (AdminCard + ConfirmDialog)
  docs/             DocsTab — in-app ABI reference
  ui/               ActionButton, Badge, ConfirmDialog, CopyButton, Field,
                    Panel, SorobanTip, TabErrorBoundary, Toast
lib/
  constants.ts      STATUS_META, colour tokens, ABI_ENDPOINTS
  tabs.ts           TABS, DEFAULT_TAB, tabPath, tabFromPathname
  types.ts          Transaction, ContractInfo, TxStatus, CallbackPayload
  mock-data.ts      MOCK_TXS, MOCK_CONTRACT_INFO
  utils.ts          shortId, elapsed, formatAmount
  wallet/           kit.ts, storage.ts, WalletProvider.tsx
  soroban/          args.ts, contract.ts, events.ts, SorobanProvider.tsx,
                    transactionMerge.ts, useLiveTransactions.ts,
                    useLiveContractInfo.ts, useSorobanStatus.ts
docs/               Documentation-site source (Markdown)
scripts/docs/       Documentation-site build (no framework, no new deps)
e2e/                Playwright specs
```

## The provider stack

`app/layout.tsx` nests three client providers, outermost first:

```text
ToastProvider
└── SorobanProvider      one RPC event poller, shared by every tab
    └── WalletProvider   address, connect, disconnect
```

`SorobanProvider` is mounted once, above the tab switcher, so switching tabs
does not restart the event poller or re-open an RPC connection. It holds both
the merged event list and the health record that the footer renders.

`WalletProvider` owns `ensureWalletKitInitialized()` and the selected-wallet
id in `localStorage`. Nothing else talks to `StellarWalletsKit` directly except
`lib/soroban/contract.ts`, which needs the sign call.

## Data flow

```text
SorobanProvider ──poll──> rpc.Server (getEvents)  ──> normalized events
                                                          │
                                          transactionMerge │ + MOCK_TXS baseline
                                                          ▼
                                            useLiveTransactions ──> tables, stat cards

WalletProvider.address ──> invokeContract() ──> TransactionBuilder
                                               -> signTransaction (extension)
                                               -> sendTransaction
                                               -> pollTransaction
```

Read-only paths (`simulateContractCall`) build the same transaction and call
`simulateTransaction()` instead, so a `get_transaction` lookup needs an address
but never a signature.

## Mock data and the live path

`useLiveTransactions` and `useLiveContractInfo` both start from a mock baseline
and overlay live data when a wallet and a contract are available.
`transactionMerge.ts` owns that rule: the mock rows are the floor, live events
are merged on top, and a live row always wins over a mock row with the same id.
That is what keeps the UI explorable with zero configuration while still showing
real data the moment it is available.

## One ABI, two renderers

The contract interface lives in exactly one place: `ABI_ENDPOINTS` in
`lib/constants.ts`.

- The in-app `DocsTab` maps over that array directly.
- The [documentation site](./contract-abi/) generates its table from the same
  file at build time, via `scripts/docs/abi-reference.mjs`.

Neither renderer owns a copy. If a method is added to the contract, it appears
in both places with no documentation edit, and it cannot appear in one and not
the other. `docs/contract-abi.md` holds only a placeholder marker for exactly
this reason; a hand-written table would be the failure mode the issue calls out.

## Styling

No CSS framework abstraction. Components pass inline `style` objects, with
shared values (`AMBER`, `BG1`, `BORDER`, `MONO`, …) imported from
`lib/constants.ts` and the handful of layout classes that need media queries
living in `globals.css`. Tailwind v4 is installed and its directives are
present, but the codebase does not currently use utility classes.

`MONO` is `var(--font-ibm-plex-mono), monospace` rather than the literal
string `"IBM Plex Mono"`, because `next/font` self-hosts the face and generates
its own family name — the literal no longer resolves.
