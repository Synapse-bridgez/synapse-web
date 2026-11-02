import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContractInfoPanel } from "@/components/dashboard/ContractInfoPanel";
import type { ContractInfo } from "@/lib/types";

let mockWallet = {
  address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" as string | null,
  network: "testnet",
  lastSubmittedAt: 0,
};

vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => mockWallet,
}));

const mockContractInfo: ContractInfo = {
  version: "v1.2.0",
  network: "testnet",
  address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  admin: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
  relay_signer: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCWHF",
  health: "healthy",
};

describe("ContractInfoPanel Component (#299)", () => {
  beforeEach(() => {
    mockWallet = {
      address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      network: "testnet",
      lastSubmittedAt: 0,
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("renders contract info metadata rows properly", () => {
    mockWallet.address = null;
    render(<ContractInfoPanel info={mockContractInfo} />);

    expect(screen.getByText("CONTRACT INFO")).toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
    expect(screen.getByText("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("shows idle balance dash when wallet is disconnected", () => {
    mockWallet.address = null;
    render(<ContractInfoPanel info={mockContractInfo} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("handles unfunded account (404) gracefully with friendbot guidance", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    } as Response);

    render(<ContractInfoPanel info={mockContractInfo} />);

    await waitFor(() => {
      expect(screen.getByText("account not funded")).toBeInTheDocument();
    });

    expect(screen.getByText(/fund it via friendbot/i)).toBeInTheDocument();
  });

  it("loads and displays XLM balance and non-native assets", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        balances: [
          { asset_type: "native", balance: "250.7500000" },
          { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "1000.00" },
        ],
      }),
    } as Response);

    render(<ContractInfoPanel info={mockContractInfo} />);

    await waitFor(() => {
      expect(screen.getByText("250.75 XLM")).toBeInTheDocument();
    });

    expect(screen.getByText("USDC")).toBeInTheDocument();
    expect(screen.getByText("1000.00")).toBeInTheDocument();
  });

  it("displays low balance warning when native balance is below threshold (< 1 XLM)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        balances: [
          { asset_type: "native", balance: "0.5000000" },
        ],
      }),
    } as Response);

    render(<ContractInfoPanel info={mockContractInfo} />);

    await waitFor(() => {
      expect(screen.getByText(/low balance:/i)).toBeInTheDocument();
    });
  });

  it("displays error message when Horizon request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    } as Response);

    render(<ContractInfoPanel info={mockContractInfo} />);

    await waitFor(() => {
      expect(screen.getByText(/error: Horizon responded 500/i)).toBeInTheDocument();
    });
  });
});
