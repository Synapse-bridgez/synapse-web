"use client";
import { AMBER } from "@/lib/constants";

export function SorobanTip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 12px",
        background: "rgba(245,166,35,0.04)",
        borderLeft: `2px solid ${AMBER}`,
        marginTop: 10,
      }}
    >
      <span
        style={{
          color: AMBER,
          fontWeight: 700,
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          whiteSpace: "nowrap",
          paddingTop: 1,
        }}
      >
        ⬡ SOROBAN:
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1.6,
        }}
      >
        {children}
      </span>
    </div>
  );
}
