"use client";
import { ABI_ENDPOINTS, BORDER, DIM, AMBER } from "@/lib/constants";

const ACCESS_COLORS: Record<string, string> = {
  "one-time":     "#A78BFA",
  "relay_signer": "#4FC3F7",
  "admin":        "#EF5350",
  "public":       "#66BB6A",
};

export function DocsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }} className="animate-fade-in">

      {/* Intro */}
      <div style={{
        background: "#14171D", border: `1px solid ${BORDER}`,
        padding: "16px 20px", marginBottom: 10,
      }}>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", color: DIM, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
          CONTRACT ABI REFERENCE · SYNAPSE CORE v0.1.0
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.75, margin: 0 }}>
          All on-chain reads use{" "}
          <span style={{ color: AMBER }}>SorobanRpc.Server.simulateTransaction()</span>{" "}
          — no wallet needed. Writes go through{" "}
          <span style={{ color: AMBER }}>TransactionBuilder → sign → submitTransaction()</span>.
          Wallet integration: <span style={{ color: AMBER }}>@creit-tech/stellar-wallets-kit</span> (Freighter / xBull).
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {Object.entries(ACCESS_COLORS).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
              <span style={{ fontSize: 9, color: c, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em" }}>{k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint rows */}
      {ABI_ENDPOINTS.map(ep => (
        <div key={ep.name} style={{
          background: "#14171D", border: `1px solid ${BORDER}`,
          padding: "14px 20px",
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: 12, alignItems: "start",
          transition: "background 0.15s",
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "#1A1E26")}
          onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "#14171D")}
        >
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
              color: AMBER, marginBottom: 4, fontWeight: 600,
            }}>{ep.name}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: "0.02em",
            }}>{ep.sig}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
            }}>{ep.desc}</div>
          </div>
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
            padding: "3px 10px",
            border: `1px solid ${(ACCESS_COLORS[ep.access] ?? "#888")}44`,
            color: ACCESS_COLORS[ep.access] ?? "#888",
            borderRadius: 2, whiteSpace: "nowrap",
          }}>{ep.access}</span>
        </div>
      ))}
    </div>
  );
}
