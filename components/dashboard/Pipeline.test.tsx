import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { STATUS_META } from "@/lib/constants";
import type { Transaction } from "@/lib/types";

function createMockTx(id: string, status: Transaction["status"]): Transaction {
  return {
    id,
    hash: `0x${id}abc`,
    source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    destination: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
    amount: "100.00",
    asset: "XLM",
    status,
    timestamp: Date.now(),
    fee: "0.001",
  };
}

describe("Pipeline Component (#302)", () => {
  it("renders transaction lifecycle panel and tip", () => {
    render(<Pipeline txs={[]} />);
    expect(screen.getByText("TRANSACTION LIFECYCLE")).toBeInTheDocument();
    expect(
      screen.getByText(/subscribe to StatusChanged events/i)
    ).toBeInTheDocument();
  });

  it("renders all four stage labels when txs is empty", () => {
    render(<Pipeline txs={[]} />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();

    // Inactive stages do not display active bracketed count tags
    expect(screen.queryByText(/\[\d+\]/)).not.toBeInTheDocument();
  });

  it("displays active counts for each populated stage status", () => {
    const txs: Transaction[] = [
      createMockTx("1", "PENDING"),
      createMockTx("2", "PROCESSING"),
      createMockTx("3", "PROCESSING"),
      createMockTx("4", "COMPLETED"),
      createMockTx("5", "COMPLETED"),
      createMockTx("6", "COMPLETED"),
      createMockTx("7", "FAILED"),
      createMockTx("8", "FAILED"),
      createMockTx("9", "FAILED"),
      createMockTx("10", "FAILED"),
    ];

    render(<Pipeline txs={txs} />);

    expect(screen.getByText("[1]")).toBeInTheDocument(); // PENDING count
    expect(screen.getByText("[2]")).toBeInTheDocument(); // PROCESSING count
    expect(screen.getByText("[3]")).toBeInTheDocument(); // COMPLETED count
    expect(screen.getByText("[4]")).toBeInTheDocument(); // FAILED count
  });

  it("displays corresponding status symbols from STATUS_META", () => {
    render(<Pipeline txs={[]} />);

    expect(screen.getByText(STATUS_META.PENDING.symbol)).toBeInTheDocument();
    expect(screen.getByText(STATUS_META.PROCESSING.symbol)).toBeInTheDocument();
    expect(screen.getByText(STATUS_META.COMPLETED.symbol)).toBeInTheDocument();
    expect(screen.getByText(STATUS_META.FAILED.symbol)).toBeInTheDocument();
  });

  it("handles single-status transaction lists correctly", () => {
    const txs: Transaction[] = [
      createMockTx("1", "FAILED"),
      createMockTx("2", "FAILED"),
    ];

    render(<Pipeline txs={txs} />);
    expect(screen.getByText("[2]")).toBeInTheDocument();
    // Only one stage is active
    expect(screen.queryByText("[0]")).not.toBeInTheDocument();
  });

  it("gracefully handles unknown or unexpected statuses without throwing", () => {
    const malformedTxs = [
      { ...createMockTx("1", "PENDING"), status: "UNKNOWN" as any },
      createMockTx("2", "COMPLETED"),
    ];

    expect(() => render(<Pipeline txs={malformedTxs} />)).not.toThrow();
    expect(screen.getByText("[1]")).toBeInTheDocument();
  });
});
