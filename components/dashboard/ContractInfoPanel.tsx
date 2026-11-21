"use client";
import { Panel } from "@/components/ui/Panel";
import { CopyButton } from "@/components/ui/CopyButton";
import { useLiveContractInfo } from "@/lib/soroban/useLiveContractInfo";
import type { ContractInfo } from "@/lib/types";

const FIELDS: { key: keyof ContractInfo; label: string; copyable?: boolean }[] = [
  { key: "version", label: "Version" },
  { key: "network", label: "Network" },
  { key: "address", label: "Contract", copyable: true },
  { key: "admin", label: "Admin", copyable: true },
  { key: "relay_signer", label: "Relay signer", copyable: true },
  { key: "health", label: "Health" },
];

export function ContractInfoPanel() {
  const info = useLiveContractInfo();

  return (
    <Panel title="CONTRACT INFO">
      <dl style={{ margin: 0 }}>
        {FIELDS.map(({ key, label, copyable }) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <dt style={{ fontSize: 10 }}>{label}</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>
              {info[key] || "—"}
              {copyable && info[key] && <CopyButton value={info[key]} label={label} />}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
