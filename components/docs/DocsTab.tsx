"use client";
import React, { useState } from "react";
import { ABI_ENDPOINTS, AMBER, BORDER, DIM, MONO } from "@/lib/constants";
import { EndpointPlayground } from "@/components/docs/EndpointPlayground";

export interface DocsTabProps {
  loading?: boolean;
  error?: string;
  endpoints?: typeof ABI_ENDPOINTS;
}

export const ACCESS_COLORS: Record<string, string> = {
  "one-time": "#A78BFA",
  relay_signer: "#4FC3F7",
  admin: "#EF5350",
  public: "#66BB6A",
};

export function DocsTab({ loading = false, error, endpoints = ABI_ENDPOINTS }: DocsTabProps = {}) {
  if (loading) {
    return (
      <div role="status" style={{ padding: "24px 16px", color: DIM, fontFamily: MONO, fontSize: 11 }}>
        Loading contract documentation…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{ padding: "24px 16px", color: "#EF5350", fontFamily: MONO, fontSize: 11 }}>
        Unable to load contract documentation: {error}
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div style={{ padding: "24px 16px", color: DIM, fontFamily: MONO, fontSize: 11 }}>
        No contract endpoints are documented yet.
      </div>
    );
  }

  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }} className="animate-fade-in" data-testid="docs-tab">
      {/* Intro */}
      <div
        data-testid="docs-intro"
        style={{
          background: "var(--bg-2, #14171D)",
          border: `1px solid ${BORDER}`,
          padding: "16px 20px",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: DIM,
            fontFamily: MONO,
            marginBottom: 10,
          }}
        >
          CONTRACT ABI REFERENCE · SYNAPSE CORE v0.1.0
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--fg-muted, rgba(255,255,255,0.55))",
            fontFamily: MONO,
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          All on-chain reads use{" "}
          <span style={{ color: AMBER }}>SorobanRpc.Server.simulateTransaction()</span> — no wallet
          needed. Writes go through{" "}
          <span style={{ color: AMBER }}>TransactionBuilder → sign → submitTransaction()</span>.
          Wallet integration: <span style={{ color: AMBER }}>@creit-tech/stellar-wallets-kit</span>{" "}
          (Freighter / xBull).
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {Object.entries(ACCESS_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }} data-testid={`access-legend-${k}`}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: c,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: c,
                  fontFamily: MONO,
                  letterSpacing: "0.08em",
                }}
              >
                {k}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint rows */}
      {endpoints.map((ep) => (
        <div
          key={ep.name}
          data-testid={`endpoint-row-${ep.name}`}
          style={{
            background: "var(--bg-2, #14171D)",
            border: `1px solid ${BORDER}`,
            padding: "14px 20px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "start",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--bg-3, #1A1E26)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--bg-2, #14171D)")}
        >
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: AMBER,
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {ep.name}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: "var(--fg-muted, rgba(255,255,255,0.4))",
                marginBottom: 8,
                letterSpacing: "0.02em",
              }}
            >
              {ep.sig}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: "var(--fg-muted, rgba(255,255,255,0.6))",
                lineHeight: 1.6,
              }}
            >
              {ep.desc}
            </div>
            <button
              type="button"
              onClick={() => setOpen((cur) => (cur === ep.name ? null : ep.name))}
              aria-expanded={open === ep.name}
              data-testid={`try-button-${ep.name}`}
              style={{
                marginTop: 10,
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.08em",
                padding: "4px 10px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: DIM,
                cursor: "pointer",
              }}
            >
              {open === ep.name ? "CLOSE PLAYGROUND" : "TRY IT"}
            </button>
            {open === ep.name && <EndpointPlayground endpoint={ep} />}
          </div>
          <span
            data-testid={`access-badge-${ep.name}`}
            style={{
              fontSize: 9,
              fontFamily: MONO,
              padding: "3px 10px",
              border: `1px solid ${ACCESS_COLORS[ep.access] ?? "#888"}44`,
              color: ACCESS_COLORS[ep.access] ?? "#888",
              borderRadius: 2,
              whiteSpace: "nowrap",
            }}
          >
            {ep.access}
          </span>
        </div>
      ))}
    </div>
  );
}

export default DocsTab;
