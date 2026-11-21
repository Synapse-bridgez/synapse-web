"use client";

import { useEffect, useState, type ReactNode } from "react";
import HealthWidget from "@/components/dashboard/HealthWidget";
import { StatCards } from "@/components/dashboard/StatCards";
import {
  getDefaultLayout,
  loadDashboardLayout,
  type DashboardLayoutPreferences,
  type DashboardWidgetId,
} from "@/lib/dashboard/layoutPreferences";
import { MOCK_TXS } from "@/lib/mock-data";

// Widgets whose components exist. Pipeline, ContractInfoPanel and RecentTxTable
// are still empty files, so they are skipped until they are implemented.
const WIDGET_RENDERERS: Partial<Record<DashboardWidgetId, () => ReactNode>> = {
  statCards: () => <StatCards txs={MOCK_TXS} />,
  health: () => <HealthWidget />,
};

export function DashboardTab() {
  const [layout, setLayout] = useState<DashboardLayoutPreferences>(getDefaultLayout);

  // Read localStorage after mount so server and client markup match.
  useEffect(() => {
    setLayout(loadDashboardLayout());
  }, []);

  const visibleIds = layout.order.filter(
    (id) => !layout.hidden.includes(id) && id in WIDGET_RENDERERS
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {visibleIds.map((id) => (
        <div key={id}>{WIDGET_RENDERERS[id]?.()}</div>
      ))}
    </div>
  );
}
