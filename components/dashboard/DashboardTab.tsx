"use client";
import { useState } from "react";
import { StatCards } from "./StatCards";
import { Pipeline } from "./Pipeline";
import { ContractInfoPanel } from "./ContractInfoPanel";
import { RecentTxTable } from "./RecentTxTable";
import { TxDetailModal } from "@/components/transactions/TxDetailModal";
import { MOCK_CONTRACT_INFO } from "@/lib/mock-data";
import { useLiveTransactions } from "@/lib/soroban/useLiveTransactions";
import type { Transaction } from "@/lib/types";

export function DashboardTab() {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const txs = useLiveTransactions();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fade-in">
      {selected && <TxDetailModal tx={selected} onClose={() => setSelected(null)} />}
      <StatCards txs={txs} />
      <Pipeline txs={txs} />
      <div className="dashboard-grid">
        <ContractInfoPanel info={MOCK_CONTRACT_INFO} />
        <RecentTxTable txs={txs} onSelect={setSelected} />
      </div>
    </div>
  );
}
