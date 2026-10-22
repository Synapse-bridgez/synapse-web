import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TxReceiptPrintView from "./TxReceiptPrintView";

const baseTransaction = {
  hash: "tx-hash-123",
  status: "SUCCESS",
  ledger: 42,
  sourceAccount: "GSOURCE",
  destination: "GDEST",
  amount: "100",
  asset: "XLM",
  fee: "0.00001",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  callbackUrl: "https://example.com/callback",
  memo: "hello",
  statusHistory: [
    { status: "PENDING", timestamp: "2024-01-01T00:00:00.000Z", detail: "submitted" },
    { status: "SUCCESS", timestamp: "2024-01-02T00:00:00.000Z", detail: null },
  ],
} as any;

describe("TxReceiptPrintView", () => {
  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("renders the transaction's core fields", () => {
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={vi.fn()} />);

    expect(screen.getByText("tx-hash-123")).toBeInTheDocument();
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("GSOURCE")).toBeInTheDocument();
    expect(screen.getByText("GDEST")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("XLM")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders an em dash for missing optional fields", () => {
    render(
      <TxReceiptPrintView
        transaction={{ ...baseTransaction, memo: undefined, callbackUrl: null }}
        onClose={vi.fn()}
      />
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders 'No status history recorded.' when statusHistory is empty", () => {
    render(
      <TxReceiptPrintView
        transaction={{ ...baseTransaction, statusHistory: [] }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("No status history recorded.")).toBeInTheDocument();
  });

  it("renders a table row per status history entry", () => {
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={vi.fn()} />);

    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("submitted")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("renders the live record URL using the current origin", () => {
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={vi.fn()} />);

    expect(
      screen.getByText(`${window.location.origin}/transactions/tx-hash-123`)
    ).toBeInTheDocument();
  });

  it("calls onClose when the Close button is clicked", () => {
    const onClose = vi.fn();
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={onClose} />);

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for a non-Escape key", () => {
    const onClose = vi.fn();
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls window.print when the Print button is clicked", () => {
    render(<TxReceiptPrintView transaction={baseTransaction} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Print / Save as PDF"));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
