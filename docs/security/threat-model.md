# Threat Model: Wallet Connection & Admin Actions

This document is a formal, structured threat model of the dashboard's
highest-stakes flows: **wallet connection**, **account/network switching**, and
**admin write actions**. It uses the [STRIDE](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
methodology applied per trust boundary.

It is intended to be a **living reference**: when you add a feature that touches
any of these flows, update the relevant section and the cross-reference table
below. The goal is to help a future contributor reason about the security
tradeoffs of a new feature, not to serve as a one-time compliance artifact.

> **Scope:** application/frontend threat surface only. Deployment/hosting
> infrastructure (CDN, DNS, CI runners, secrets at rest) is explicitly out of
> scope, consistent with this repo's frontend-only scope.

---

## 1. Assets

| Asset | Description | Sensitivity |
| --- | --- | --- |
| `A1` Wallet address / account | The connected user's public address and account identity | Medium |
| `A2` Signing capability | The ability to prompt the wallet to sign messages/transactions | Critical |
| `A3` Session / connection state | Which wallet, chain, and account the app believes it is bound to | High |
| `A4` Admin privileges | The set of write actions gated behind an admin role | Critical |
| `A5` Admin action payloads | Parameters of admin writes (targets, amounts, config) | High |
| `A6` RPC responses | Chain data returned by the configured RPC provider | Medium |
| `A7` App integrity | The served frontend bundle and its dependencies | Critical |

## 2. Trust Boundaries

| ID | Boundary | Untrusted side | Trusted side |
| --- | --- | --- | --- |
| `TB1` | Wallet extension ↔ app | Wallet extension / injected provider | App code |
| `TB2` | App ↔ RPC provider | RPC provider responses | App code |
| `TB3` | User ↔ app UI | User input / navigation | App code |
| `TB4` | App ↔ admin backend | App-originated admin writes | Backend authorization |

## 3. STRIDE Analysis

### 3.1 Wallet Connection (`TB1`, `TB3`)

| STRIDE | Threat | Notes |
| --- | --- | --- |
| **S**poofing | A malicious page or injected script impersonates the wallet provider (`window.ethereum`) and returns an attacker-controlled address. | Provider identity must be validated; never trust an unverified injected object. |
| **T**ampering | A malicious extension rewrites the address or chain returned during connect. | Re-verify address/chain against the provider after connect. |
| **R**epudiation | User denies having connected / signed a message. | Persist a connection audit trail (wallet, chain, timestamp). |
| **I**nformation disclosure | Connection metadata (address, chain) leaks to third parties via analytics or referrers. | Minimize telemetry; never send addresses to third-party endpoints. |
| **D**enial of service | Provider hangs or rejects `eth_requestAccounts`, leaving the UI in a stuck state. | Timeouts and explicit error states on connect. |
| **E**levation of privilege | A stale/forged connection state grants access to authenticated views. | Re-validate session on load; never trust client-only session flags. |

### 3.2 Account / Network Switching (`TB1`, `TB2`, `TB3`)

| STRIDE | Threat | Notes |
| --- | --- | --- |
| **S**poofing | A chain ID is spoofed so the app believes it is on the expected network. | Validate chain ID against an allowlist, not just presence. |
| **T**ampering | Account or chain changes mid-session invalidate assumptions in in-flight admin writes. | Re-check account/chain immediately before any write. |
| **R**epudiation | User disputes which account/chain an action was performed under. | Record account + chain with each action. |
| **I**nformation disclosure | Switching to an unknown chain exposes the app to a hostile RPC that logs requests. | Warn on unsupported chains; restrict RPC to configured providers. |
| **D**enial of service | Rapid account/chain churn causes race conditions and inconsistent UI. | Debounce and serialize state updates. |
| **E**levation of privilege | Switching to a chain where the user holds admin rights is used to bypass intended gating. | Admin gating must be chain-aware and re-evaluated on switch. |

### 3.3 Admin Write Actions (`TB3`, `TB4`)

| STRIDE | Threat | Notes |
| --- | --- | --- |
| **S**poofing | A non-admin user triggers an admin write by manipulating client state. | Authorization must be enforced server-side; client gating is UX only. |
| **T**ampering | Admin payloads are modified in transit or in the client before submission. | Sign/validate payloads; never trust client-supplied parameters. |
| **R**epudiation | An admin denies performing a destructive write. | Immutable audit log of admin actions (actor, action, payload hash, time). |
| **I**nformation disclosure | Admin-only data (config, addresses) is exposed to non-admins via the UI or API. | Enforce read authorization, not just write. |
| **D**enial of service | A destructive admin action is submitted repeatedly (double-submit / replay). | Idempotency keys and confirmation steps for destructive actions. |
| **E**levation of privilege | Privilege escalation via a compromised admin session or missing re-auth on sensitive writes. | Require re-authentication / explicit confirmation for high-impact writes. |

## 4. Cross-Reference: Threats → Mitigations

Each threat is mapped to the mitigating issue/control in this security wave, or
flagged as an **open gap** with a follow-up issue.

| # | Threat | Boundary | Mitigating issue / control | Status |
| --- | --- | --- | --- | --- |
| T1 | Spoofed wallet provider | TB1 | Provider identity validation on connect | Mitigated |
| T2 | Tampered address/chain on connect | TB1 | Re-verify address/chain post-connect | Mitigated |
| T3 | Missing connection audit trail | TB1 | Persist connection metadata | Open gap → follow-up issue |
| T4 | Address leakage via telemetry | TB1/TB3 | Telemetry minimization policy | Open gap → follow-up issue |
| T5 | Connect hang / stuck UI | TB1 | Connect timeout + error states | Mitigated |
| T6 | Forged client-only session | TB1/TB3 | Server-side session re-validation | Mitigated |
| T7 | Spoofed chain ID | TB2 | Chain allowlist validation | Mitigated |
| T8 | Mid-session account/chain change | TB1/TB2 | Re-check before write | Mitigated |
| T9 | Hostile RPC on unknown chain | TB2 | Unsupported-chain warning + RPC allowlist | Open gap → follow-up issue |
| T10 | Account/chain churn races | TB3 | Debounce/serialize state updates | Mitigated |
| T11 | Chain-aware admin gating bypass | TB3/TB4 | Re-evaluate gating on switch | Open gap → follow-up issue |
| T12 | Client-side-only admin gating | TB3/TB4 | Server-side authorization | Mitigated |
| T13 | Tampered admin payloads | TB4 | Payload signing/validation | Mitigated |
| T14 | No admin audit log | TB4 | Immutable admin audit log | Open gap → follow-up issue |
| T15 | Admin data exposed to non-admins | TB3/TB4 | Read authorization | Mitigated |
| T16 | Admin write replay / double-submit | TB4 | Idempotency keys + confirmation | Open gap → follow-up issue |
| T17 | Missing re-auth on sensitive writes | TB4 | Re-auth / explicit confirmation | Open gap → follow-up issue |

## 5. Open Gaps

Each open gap above must be filed as a follow-up issue and linked here. When a
gap is closed, update its row to **Mitigated** and reference the closing PR.

- [ ] T3 — Connection audit trail
- [ ] T4 — Telemetry minimization for addresses
- [ ] T9 — Unsupported-chain / hostile-RPC warning
- [ ] T11 — Chain-aware admin gating
- [ ] T14 — Immutable admin audit log
- [ ] T16 — Idempotency for admin writes
- [ ] T17 — Re-authentication for high-impact writes

## 6. Maintenance

- **When adding a feature:** identify which trust boundaries it crosses, add any
  new threats to §3, and add rows to §4.
- **When closing a gap:** update §4 and §5 and link the closing PR.
- **Review cadence:** re-review this document whenever a change touches `TB1` or
  `TB4`.
