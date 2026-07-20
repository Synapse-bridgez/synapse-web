"use client";
import { STATUS_META } from "@/lib/constants";
import type { TxStatus } from "@/lib/types";

export function Badge({ status }: { status: TxStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        padding: "2px 8px",
        borderRadius: 2,
        color: m.color,
        background: m.bg,
        border: `1px solid ${m.color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}
