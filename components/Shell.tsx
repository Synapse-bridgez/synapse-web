"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { TabErrorBoundary } from "@/components/ui/TabErrorBoundary";
import { AMBER, BG1, BORDER, DIM, MONO, STATUS_META } from "@/lib/constants";
import { useSorobanStatus } from "@/lib/soroban/useSorobanStatus";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useToast } from "@/components/ui/Toast";
import { shortId } from "@/lib/utils";
import { useWalletExtensionDetection } from "@/lib/wallet/detection";
import { NoWalletGuidance } from "@/components/wallet/NoWalletGuidance";

const TabLoadingFallback = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      padding: "40px 20px",
      textAlign: "center",
      fontFamily: MONO,
      fontSize: 11,
      color: DIM,
      letterSpacing: "0.1em",
    }}
  >
    LOADING TAB MODULE…
  </div>
);

// Code-split each tab into lazy-loaded chunks via next/dynamic
const DashboardTab = dynamic(
  () => import("./dashboard/DashboardTab").then((mod) => mod.DashboardTab),
  { loading: () => <TabLoadingFallback /> }
);

const TransactionsTab = dynamic(
  () => import("./transactions/TransactionsTab").then((mod) => mod.TransactionsTab),
  { loading: () => <TabLoadingFallback /> }
);

const AdminTab = dynamic(() => import("./admin/AdminTab").then((mod) => mod.AdminTab), {
  loading: () => <TabLoadingFallback />,
});

const DocsTab = dynamic(() => import("./docs/DocsTab").then((mod) => mod.DocsTab), {
  loading: () => <TabLoadingFallback />,
});

export type Tab = "dashboard" | "transactions" | "admin" | "docs";
export const TABS: Tab[] = ["dashboard", "transactions", "admin", "docs"];

export function Shell({ initialTab = "dashboard" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showGuidance, setShowGuidance] = useState(false);
  const { status: rpcStatus, lastEventAge, health: rpcHealth } = useSorobanStatus();
  const { address, connecting, error, connect, disconnect } = useWallet();
  const { hasAny, checked } = useWalletExtensionDetection();
  const connected = address !== null;
  const { toast } = useToast();
  const navRef = useRef<HTMLElement>(null);

  // Sync tab from URL hash if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").toLowerCase() as Tab;
      if (TABS.includes(hash)) {
        setTab(hash);
      }
    }
  }, []);

  const handleTabSelect = (selectedTab: Tab) => {
    setTab(selectedTab);
    if (typeof window !== "undefined") {
      window.location.hash = selectedTab;
    }
  };

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const prevAddress = useRef<string | null>(null);
  useEffect(() => {
    if (address && !prevAddress.current) {
      toast(`Wallet connected: ${shortId(address)}`, "success");
    }
    prevAddress.current = address;
  }, [address, toast]);

  // Keyboard navigation for tabs (WCAG 2.1 AA TabList Pattern)
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    handleTabSelect(TABS[nextIndex]);
    const buttons = navRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  const handleConnectClick = () => {
    if (connected) {
      disconnect();
    } else if (checked && !hasAny) {
      setShowGuidance(true);
    } else {
      connect();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <header className="shell-header" role="banner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: "#fff" }}>
            SYNAPSE
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: AMBER,
              display: "inline-block",
              boxShadow: `0 0 8px 2px rgba(245,166,35,0.55)`,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: "#fff" }}>
            CORE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontSize: 9,
              color: DIM,
              letterSpacing: "0.14em",
              padding: "3px 10px",
              border: `1px solid ${BORDER}`,
            }}
          >
            TESTNET
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? STATUS_META.COMPLETED.color : "#444",
              display: "inline-block",
              boxShadow: connected ? `0 0 6px 2px ${STATUS_META.COMPLETED.glow}` : "none",
              transition: "all 0.3s",
            }}
          />
          <button
            onClick={handleConnectClick}
            disabled={connecting}
            aria-label={
              connected ? `Connected account ${address}. Click to disconnect` : "Connect wallet"
            }
            style={{
              padding: "7px 18px",
              background: connected ? "transparent" : "rgba(245,166,35,0.08)",
              border: `1px solid ${connected ? BORDER : AMBER}`,
              color: connected ? "#ccc" : AMBER,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 600,
              cursor: connecting ? "wait" : "pointer",
              letterSpacing: "0.06em",
              transition: "all 0.2s",
              opacity: connecting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!connected) e.currentTarget.style.background = "rgba(245,166,35,0.16)";
            }}
            onMouseLeave={(e) => {
              if (!connected) e.currentTarget.style.background = "rgba(245,166,35,0.08)";
            }}
          >
            {connecting ? "connecting…" : connected ? shortId(address) : "connect wallet"}
          </button>
        </div>
      </header>

      {/* ── No Wallet Guidance Modal ── */}
      {showGuidance && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowGuidance(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <NoWalletGuidance
              onClose={() => setShowGuidance(false)}
              onProceedAnyway={() => {
                setShowGuidance(false);
                connect();
              }}
            />
          </div>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <nav ref={navRef} className="shell-nav" role="tablist" aria-label="Dashboard sections">
        {TABS.map((t, idx) => (
          <button
            key={t}
            id={`tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`tabpanel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => handleTabSelect(t)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
            style={{
              padding: "12px 22px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: tab === t ? "#fff" : DIM,
              borderBottom: tab === t ? `2px solid ${AMBER}` : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s",
              outlineOffset: "-2px",
            }}
            onMouseEnter={(e) => {
              if (tab !== t) e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
            onMouseLeave={(e) => {
              if (tab !== t) e.currentTarget.style.color = DIM;
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* ── Body ── */}
      <main
        className="shell-main"
        id={`tabpanel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "dashboard" && (
          <TabErrorBoundary title="Dashboard tab error">
            <DashboardTab />
          </TabErrorBoundary>
        )}
        {tab === "transactions" && (
          <TabErrorBoundary title="Transactions tab error">
            <TransactionsTab />
          </TabErrorBoundary>
        )}
        {tab === "admin" && (
          <TabErrorBoundary title="Admin tab error">
            <AdminTab />
          </TabErrorBoundary>
        )}
        {tab === "docs" && (
          <TabErrorBoundary title="Docs tab error">
            <DocsTab />
          </TabErrorBoundary>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        role="contentinfo"
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: "10px 28px",
          display: "flex",
          justifyContent: "space-between",
          background: BG1,
        }}
      >
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em" }}>
          SYNAPSE CORE · v0.1.0 · TESTNET
        </span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            color:
              rpcStatus === "connected"
                ? STATUS_META.COMPLETED.color
                : rpcStatus === "error"
                  ? STATUS_META.FAILED.color
                  : DIM,
          }}
        >
          ⬡ SOROBAN RPC:{" "}
          {rpcStatus === "connected"
            ? `connected${lastEventAge ? ` · last event ${lastEventAge}` : ""}`
            : rpcStatus === "error"
              ? `error${rpcHealth.error ? `: ${rpcHealth.error}` : ""}`
              : "connecting"}
        </span>
      </footer>
    </div>
  );
}
