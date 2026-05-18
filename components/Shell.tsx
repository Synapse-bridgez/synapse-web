"use client";
import { useState } from "react";
import { DashboardTab } from "./dashboard/DashboardTab";
import { TransactionsTab } from "./transactions/TransactionsTab";
import { AdminTab } from "./admin/AdminTab";
import { DocsTab } from "./docs/DocsTab";
import { AMBER, BG1, BORDER, DIM } from "@/lib/constants";
import { STATUS_META } from "@/lib/constants";

type Tab = "dashboard" | "transactions" | "admin" | "docs";
const TABS: Tab[] = ["dashboard", "transactions", "admin", "docs"];

export function Shell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [connected, setConnected] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{
        background: BG1,
        borderBottom: `1px solid ${BORDER}`,
        padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 54, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: "#fff" }}>SYNAPSE</span>
          <span style={{
            width: 9, height: 9, borderRadius: "50%",
            background: AMBER, display: "inline-block",
            boxShadow: `0 0 8px 2px rgba(245,166,35,0.55)`,
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: "#fff" }}>CORE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            fontSize: 9, color: DIM, letterSpacing: "0.14em",
            padding: "3px 10px", border: `1px solid ${BORDER}`,
          }}>TESTNET</span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? STATUS_META.COMPLETED.color : "#444",
            display: "inline-block",
            boxShadow: connected ? `0 0 6px 2px ${STATUS_META.COMPLETED.glow}` : "none",
            transition: "all 0.3s",
          }} />
          <button
            onClick={() => setConnected(v => !v)}
            style={{
              padding: "7px 18px",
              background: connected ? "transparent" : "rgba(245,166,35,0.08)",
              border: `1px solid ${connected ? BORDER : AMBER}`,
              color: connected ? "#aaa" : AMBER,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.06em",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              if (!connected) (e.currentTarget).style.background = "rgba(245,166,35,0.16)";
            }}
            onMouseLeave={e => {
              if (!connected) (e.currentTarget).style.background = "rgba(245,166,35,0.08)";
            }}
          >
            {connected ? "GMOCK…WALLET" : "connect wallet"}
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav style={{
        background: BG1,
        borderBottom: `1px solid ${BORDER}`,
        padding: "0 28px",
        display: "flex", gap: 0,
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "12px 22px",
              background: "none", border: "none",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, letterSpacing: "0.1em",
              color: tab === t ? "#fff" : DIM,
              borderBottom: tab === t ? `2px solid ${AMBER}` : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { if (tab !== t) (e.currentTarget).style.color = "rgba(255,255,255,0.65)"; }}
            onMouseLeave={e => { if (tab !== t) (e.currentTarget).style.color = DIM; }}
          >{t}</button>
        ))}
      </nav>

      {/* ── Body ── */}
      <main style={{ flex: 1, maxWidth: 1140, width: "100%", margin: "0 auto", padding: "22px 28px" }}>
        {tab === "dashboard"    && <DashboardTab />}
        {tab === "transactions" && <TransactionsTab />}
        {tab === "admin"        && <AdminTab />}
        {tab === "docs"         && <DocsTab />}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`,
        padding: "10px 28px",
        display: "flex", justifyContent: "space-between",
        background: BG1,
      }}>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em" }}>
          SYNAPSE CORE · v0.1.0 · TESTNET · MOCK DATA
        </span>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em" }}>
          ⬡ SOROBAN RPC: not connected
        </span>
      </footer>
    </div>
  );
}
