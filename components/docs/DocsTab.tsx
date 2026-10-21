"use client";
import { useState } from "react";
import {
  ABI_ENDPOINTS,
  AMBER,
  BG0,
  BG2,
  BG3,
  BORDER,
  DANGER,
  DANGER_SURFACE,
  DIM,
  FG_MUTED,
  INFO,
  MONO,
  NEUTRAL,
  ON_ACCENT,
  SUCCESS,
  VIOLET,
} from "@/lib/constants";
import { encodeArg } from "@/lib/soroban/args";
import { simulateCall, submitCall } from "@/lib/soroban/contract";

const ACCESS_COLORS: Record<string, string> = {
  "one-time": VIOLET,
  relay_signer: INFO,
  admin: DANGER,
  public: SUCCESS,
};

const STATE_CHANGING = new Set(["one-time", "relay_signer", "admin"]);

function isStateChanging(access: string): boolean {
  return STATE_CHANGING.has(access);
}

function PlaygroundForm({ ep }: { ep: (typeof ABI_ENDPOINTS)[number] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const params = ep.params ?? [];
  const stateChanging = isStateChanging(ep.access);

  function buildArgs() {
    return params.map((p) => encodeArg(p.type, values[p.name] ?? ""));
  }

  async function runSimulate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await simulateCall(ep.name, buildArgs());
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runSubmit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitCall(ep.name, buildArgs());
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        borderTop: `1px solid ${BORDER}`,
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {params.length === 0 && (
        <div style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>
          No parameters — call directly.
        </div>
      )}
      {params.map((p) => (
        <label key={p.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: "0.08em" }}>
            {p.name} · {p.type}
          </span>
          <input
            value={values[p.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
            placeholder={p.type}
            style={{
              background: BG0,
              border: `1px solid ${BORDER}`,
              color: NEUTRAL,
              fontFamily: MONO,
              fontSize: 11,
              padding: "6px 8px",
              outline: "none",
            }}
          />
        </label>
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={runSimulate}
          disabled={busy}
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "6px 14px",
            background: "transparent",
            border: `1px solid ${AMBER}`,
            color: AMBER,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          SIMULATE
        </button>
        {stateChanging && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.08em",
              padding: "6px 14px",
              background: "transparent",
              border: `1px solid ${DANGER}`,
              color: DANGER,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            SUBMIT
          </button>
        )}
      </div>

      {confirming && (
        <div
          style={{
            border: `1px solid ${DANGER}`,
            background: DANGER_SURFACE,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, color: DANGER, lineHeight: 1.6 }}>
            WARNING: {ep.name} is a state-changing entrypoint. Submitting will sign and broadcast a
            real transaction on the connected network. Continue?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={runSubmit}
              disabled={busy}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                padding: "5px 12px",
                background: DANGER,
                border: "none",
                color: ON_ACCENT,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              CONFIRM SUBMIT
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                padding: "5px 12px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: DIM,
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {error && (
        <pre
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: DANGER,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {error}
        </pre>
      )}
      {result && (
        <pre
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: SUCCESS,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}

export function DocsTab() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }} className="animate-fade-in">
      {/* Intro */}
      <div
        style={{
          background: BG2,
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
            color: FG_MUTED,
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
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
      {ABI_ENDPOINTS.map((ep) => (
        <div
          key={ep.name}
          style={{
            background: BG2,
            border: `1px solid ${BORDER}`,
            padding: "14px 20px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "start",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = BG3)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = BG2)}
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
                color: DIM,
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
                color: FG_MUTED,
                lineHeight: 1.6,
              }}
            >
              {ep.desc}
            </div>
            <button
              type="button"
              onClick={() => setOpen((cur) => (cur === ep.name ? null : ep.name))}
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
            {open === ep.name && <PlaygroundForm ep={ep} />}
          </div>
          <span
            style={{
              fontSize: 9,
              fontFamily: MONO,
              padding: "3px 10px",
              border: `1px solid color-mix(in srgb, ${ACCESS_COLORS[ep.access] ?? DIM} 27%, transparent)`,
              color: ACCESS_COLORS[ep.access] ?? DIM,
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
