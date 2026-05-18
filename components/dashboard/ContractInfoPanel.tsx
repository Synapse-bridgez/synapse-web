"use client";
import { Panel } from "@/components/ui/Panel";
import { SorobanTip } from "@/components/ui/SorobanTip";
import { BORDER, DIM } from "@/lib/constants";
import type { ContractInfo } from "@/lib/types";

export function ContractInfoPanel({ info }: { info: ContractInfo }) {
  const rows: [string, string][] = [
    ["version",      info.version],
    ["network",      info.network],
    ["address",      info.address],
    ["admin",        info.admin],
    ["relay signer", info.relay_signer],
    ["health",       info.health],
  ];

  return (
    <Panel title="CONTRACT INFO">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "6px 0", fontSize: 11, color: DIM, fontFamily: "'IBM Plex Mono', monospace", width: "38%", verticalAlign: "top" }}>{k}</td>
              <td style={{
                padding: "6px 0 6px 8px", fontSize: 10, color: "#ccc",
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "right", wordBreak: "break-all", maxWidth: 180,
              }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SorobanTip>health() + version() → populate on load via read-only simulation</SorobanTip>
    </Panel>
  );
}
