"use client";
import { useState, useEffect, useRef } from "react";
import { DashboardTab } from "./dashboard/DashboardTab";
import { TransactionsTab } from "./transactions/TransactionsTab";
import { AdminTab } from "./admin/AdminTab";
import { DocsTab } from "./docs/DocsTab";
import { TabErrorBoundary } from "@/components/ui/TabErrorBoundary";
import { AMBER, BG1, BORDER, DIM, MONO, STATUS_META } from "@/lib/constants";
import { useSorobanStatus } from "@/lib/soroban/useSorobanStatus";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useToast } from "@/components/ui/Toast";
import { shortId } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

type Tab = "dashboard" | "transactions" | "admin" | "docs";
const TABS: Tab[] = ["dashboard", "transactions", "admin", "docs"];

export function Shell() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { status: rpcStatus, lastEventAge, health: rpcHealth } = useSorobanStatus();
  const { address, connecting, error, connect, disconnect } = useWallet();
  const connected = address !== null;
  const { toast } = useToast();
  const t = useTranslations("Shell");
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const prevAddress = useRef<string | null>(null);
  useEffect(() => {
    if (address && !prevAddress.current) {
      toast(t("walletConnected", { address: shortId(address) }), "success");
    }
    prevAddress.current = address;
  }, [address, toast, t]);

  const onLocaleChange = (next: Locale) => {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <header className="shell-header">
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
            {t("network")}
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {t("language")}
            </span>
            <select
              aria-label={t("language")}
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
              style={{
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: DIM,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.08em",
                padding: "4px 6px",
                cursor: "pointer",
              }}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l} style={{ background: BG1, color: "#fff" }}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
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
            onClick={() => (connected ? disconnect() : connect())}
            disabled={connecting}
            style={{
              padding: "7px 18px",
              background: connected ? "transparent" : "rgba(245,166,35,0.08)",
              border: `1px solid ${connected ? BORDER : AMBER}`,
              color: connected ? "#aaa" : AMBER,
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
            {connecting ? t("connecting") : connected ? shortId(address) : t("connectWallet")}
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="shell-nav" role="tablist" aria-label={t("sections")}>
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: "12px 22px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: tab === tabKey ? "#fff" : DIM,
              borderBottom: tab === tabKey ? `2px solid ${AMBER}` : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (tab !== tabKey) e.currentTarget.style.color = "rgba(255,255,255,0.65)";
            }}
            onMouseLeave={(e) => {
              if (tab !== tabKey) e.currentTarget.style.color = DIM;
            }}
          >
            {t(`tabs.${tabKey}`)}
          </button>
        ))}
      </nav>

      {/* ── Body ── */}
      <main className="shell-main">
        {tab === "dashboard" && (
          <TabErrorBoundary title={t("tabError", { tab: t("tabs.dashboard") })}>
            <DashboardTab />
          </TabErrorBoundary>
        )}
        {tab === "transactions" && (
          <TabErrorBoundary title={t("tabError", { tab: t("tabs.transactions") })}>
            <TransactionsTab />
          </TabErrorBoundary>
        )}
        {tab === "admin" && (
          <TabErrorBoundary title={t("tabError", { tab: t("tabs.admin") })}>
            <AdminTab />
          </TabErrorBoundary>
        )}
        {tab === "docs" && (
          <TabErrorBoundary title={t("tabError", { tab: t("tabs.docs") })}>
            <DocsTab />
          </TabErrorBoundary>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: "10px 28px",
          display: "flex",
          justifyContent: "space-between",
          background: BG1,
        }}
      >
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em" }}>
          {t("footer", { version: "0.1.0" })}
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
          ⬡ {t("rpc.label")}:{" "}
          {rpcStatus === "connected"
            ? lastEventAge
              ? t("rpc.connectedWithEvent", { age: lastEventAge })
              : t("rpc.connected")
            : rpcStatus === "error"
              ? rpcHealth.error
                ? t("rpc.errorWithDetail", { detail: rpcHealth.error })
                : t("rpc.error")
              : t("rpc.connecting")}
        </span>
      </footer>
    </div>
  );
}
