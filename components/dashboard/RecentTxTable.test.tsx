import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecentTxTable } from "@/components/dashboard/RecentTxTable";
import { ToastProvider } from "@/components/ui/Toast";
import type { Transaction } from "@/lib/types";

const mockTxs: Transaction[] = [
  {
    id: "tx-alpha-1234567890",
    asset: "XLM",
    amount: "150.75",
    from: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    to: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
    status: "COMPLETED",
    timestamp: Date.now() - 60000,
    created_at: Date.now() - 60000,
    fee: "0.00001",
  },
  {
    id: "tx-beta-0987654321",
    asset: "USDC",
    amount: "2500.00",
    from: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCWHF",
    to: "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDWHF",
    status: "PROCESSING",
    timestamp: Date.now() - 120000,
    created_at: Date.now() - 120000,
    fee: "0.00002",
  },
];

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("RecentTxTable Component (#303)", () => {
  it("renders panel title, column headers, and Soroban tip", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={[]} onSelect={onSelect} />);

    expect(screen.getByText("RECENT TRANSACTIONS")).toBeInTheDocument();
    expect(screen.getByText("TX ID")).toBeInTheDocument();
    expect(screen.getByText("ASSET")).toBeInTheDocument();
    expect(screen.getByText("AMOUNT")).toBeInTheDocument();
    expect(screen.getByText("STATUS")).toBeInTheDocument();
    expect(screen.getByText("AGE")).toBeInTheDocument();
    expect(
      screen.getByText(/parse TransactionRegistered events from RPC/i)
    ).toBeInTheDocument();
  });

  it("renders transaction rows and mobile cards with correct data", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={mockTxs} onSelect={onSelect} />);

    // Asset checks
    expect(screen.getAllByText("XLM").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("USDC").length).toBeGreaterThanOrEqual(1);

    // Formatted amount checks
    expect(screen.getAllByText("150.75").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2500.00").length).toBeGreaterThanOrEqual(1);

    // Status badges
    expect(screen.getAllByText("COMPLETED").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PROCESSING").length).toBeGreaterThanOrEqual(1);
  });

  it("triggers onSelect callback when clicking a table row", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={mockTxs} onSelect={onSelect} />);

    // Find table row
    const row = screen
      .getAllByText("150.75")
      .map((el) => el.closest("tr"))
      .find((tr) => tr !== null);

    expect(row).toBeDefined();
    if (row) {
      fireEvent.click(row);
      expect(onSelect).toHaveBeenCalledWith(mockTxs[0]);
    }
  });

  it("triggers onSelect callback when clicking a mobile card button", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={mockTxs} onSelect={onSelect} />);

    // Mobile cards are rendered as buttons with transaction contents
    const buttons = screen.getAllByRole("button").filter((btn) =>
      btn.textContent?.includes("150.75")
    );
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(mockTxs[0]);
  });

  it("renders copy button with accessible aria-label", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={mockTxs} onSelect={onSelect} />);

    const copyButtons = screen.getAllByLabelText("Copy Tx ID");
    expect(copyButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("handles mouse enter and mouse leave on table rows", () => {
    const onSelect = vi.fn();
    renderWithToast(<RecentTxTable txs={mockTxs} onSelect={onSelect} />);

    const row = screen
      .getAllByText("150.75")
      .map((el) => el.closest("tr"))
      .find((tr) => tr !== null);

    expect(row).toBeDefined();
    if (row) {
      fireEvent.mouseEnter(row);
      fireEvent.mouseLeave(row);
    }
  });

  it("handles null or undefined txs prop gracefully without throwing", () => {
    const onSelect = vi.fn();
    expect(() =>
      renderWithToast(
        <RecentTxTable txs={undefined as any} onSelect={onSelect} />
      )
    ).not.toThrow();
  });
});
