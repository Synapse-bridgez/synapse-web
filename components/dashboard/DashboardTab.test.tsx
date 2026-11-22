import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardTab } from "./DashboardTab";
import { DASHBOARD_LAYOUT_STORAGE_KEY } from "@/lib/dashboard/layoutPreferences";

const live = { txs: [] as { id: string }[], info: null as unknown };
vi.mock("@/lib/soroban/useLiveTransactions", () => ({ useLiveTransactions: () => live.txs }));
vi.mock("@/lib/soroban/useLiveContractInfo", () => ({ useLiveContractInfo: () => live.info }));

// Child widgets have their own tests; stub them so this suite covers DashboardTab's own behaviour.
vi.mock("./StatCards", () => ({ StatCards: () => <div>stat-cards</div> }));
vi.mock("./Pipeline", () => ({ Pipeline: () => <div>pipeline</div> }));
vi.mock("./HealthWidget", () => ({ default: () => <div>health</div> }));
vi.mock("./ContractInfoPanel", () => ({ ContractInfoPanel: () => <div>contract-info</div> }));
vi.mock("./RecentTxTable", () => ({
  RecentTxTable: ({ txs, onSelect }: { txs: { id: string }[]; onSelect: (t: { id: string }) => void }) => (
    <button onClick={() => onSelect(txs[0]!)}>recent-tx</button>
  ),
}));
vi.mock("@/components/transactions/TxDetailModal", () => ({
  TxDetailModal: ({ tx, onClose }: { tx: { id: string }; onClose: () => void }) => (
    <div role="dialog">
      detail {tx.id}
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const widgetOrder = () =>
  screen.getAllByLabelText(/ widget$/).map((el) => el.getAttribute("aria-label"));

describe("DashboardTab", () => {
  beforeEach(() => {
    localStorage.clear();
    live.txs = [{ id: "tx-1" }];
    live.info = { version: "1" };
  });

  it("shows the loading state", () => {
    render(<DashboardTab loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard…");
  });

  it("shows the error state", () => {
    render(<DashboardTab error="boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load dashboard: boom");
  });

  it("shows the empty state when there is no activity and no contract info", () => {
    live.txs = [];
    live.info = null;
    render(<DashboardTab />);
    expect(screen.getByText("No dashboard activity is available yet.")).toBeInTheDocument();
  });

  it("can go from loading to loaded without breaking hook order", () => {
    const { rerender } = render(<DashboardTab loading />);
    rerender(<DashboardTab />);
    expect(screen.getByText("stat-cards")).toBeInTheDocument();
  });

  it("renders every widget in the default order", () => {
    render(<DashboardTab />);
    expect(widgetOrder()).toEqual([
      "Stat Cards widget",
      "Pipeline widget",
      "Platform Health widget",
      "Contract Info widget",
      "Recent Transactions widget",
    ]);
  });

  it("hides and re-shows a widget and persists the choice", () => {
    render(<DashboardTab />);
    const toggle = screen.getByLabelText("Toggle Pipeline visibility");
    fireEvent.click(toggle);
    expect(screen.queryByText("pipeline")).not.toBeInTheDocument();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toContain("pipeline");
    fireEvent.click(toggle);
    expect(screen.getByText("pipeline")).toBeInTheDocument();
  });

  it("reorders with the move buttons, disables them at the edges, and resets", () => {
    render(<DashboardTab />);
    expect(screen.getByLabelText("Move Stat Cards up")).toBeDisabled();
    expect(screen.getByLabelText("Move Recent Transactions down")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Move Stat Cards down"));
    expect(widgetOrder().slice(0, 2)).toEqual(["Pipeline widget", "Stat Cards widget"]);
    fireEvent.click(screen.getByText("Reset to default"));
    expect(widgetOrder()[0]).toBe("Stat Cards widget");
  });

  it("reorders by drag and drop", () => {
    render(<DashboardTab />);
    const [first, , third] = screen.getAllByLabelText(/ widget$/);
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: "", dropEffect: "" };
    fireEvent.dragStart(first!, { dataTransfer });
    fireEvent.dragOver(third!, { dataTransfer });
    fireEvent.drop(third!, { dataTransfer });
    expect(widgetOrder()[2]).toBe("Stat Cards widget");
  });

  it("opens and closes the transaction detail modal", () => {
    render(<DashboardTab />);
    fireEvent.click(screen.getByText("recent-tx"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("detail tx-1");
    fireEvent.click(within(dialog).getByText("close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
