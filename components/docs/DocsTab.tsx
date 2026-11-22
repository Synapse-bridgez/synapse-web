"use client";

import { useState } from "react";
import { ABI_ENDPOINTS, AMBER, BG2, BORDER, DIM, MONO } from "@/lib/constants";
import { EndpointPlayground } from "./EndpointPlayground";

const ACCESS_COLORS: Record<string, string> = {
  public: "#66BB6A",
  relay_signer: AMBER,
  admin: "#EF5350",
  "one-time": "#9E9E9E",
};

export function DocsTab() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div data-testid="docs-tab" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.1em", color: DIM, margin: 0 }}>CONTRACT ABI REFERENCE</h2>
      {ABI_ENDPOINTS.length === 0 && (
        <div data-testid="empty-state" style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>No endpoints available.</div>
      )}
      {ABI_ENDPOINTS.map((endpoint) => {
        const isOpen = open === endpoint.name;
        const color = ACCESS_COLORS[endpoint.access] ?? DIM;
        return (
          <section key={endpoint.name} style={{ background: BG2, border: `1px solid ${BORDER}`, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <code style={{ fontFamily: MONO, fontSize: 12 }}>{endpoint.name}</code>
              <span style={{ fontFamily: MONO, fontSize: 9, color, border: `1px solid ${color}`, padding: "2px 6px" }}>{endpoint.access}</span>
            </div>
            <code style={{ display: "block", fontFamily: MONO, fontSize: 10, color: DIM, marginTop: 6 }}>{endpoint.sig}</code>
            <p style={{ fontSize: 12, margin: "6px 0" }}>{endpoint.desc}</p>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : endpoint.name)}
              style={{ fontFamily: MONO, fontSize: 10, background: "transparent", border: `1px solid ${BORDER}`, color: DIM, padding: "4px 10px", cursor: "pointer" }}
            >
              {isOpen ? "HIDE PLAYGROUND" : "TRY IT"}
            </button>
            {isOpen && <EndpointPlayground endpoint={endpoint} />}
          </section>
        );
      })}
    </div>
  );
}
