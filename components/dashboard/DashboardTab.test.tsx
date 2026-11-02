import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DashboardTab } from "./DashboardTab";
import type { Transaction, ContractInfo } from "@/lib/types";

// Mock data
const mockTransactions: Transaction[] = [
  {
    tx_id: "tx-test-001",
    status: "COMPLETED",
    callback_url: "https://example.com/callback",
    created_at: 1729000000,
    updated_at: 1729000100,
    ledger: 12345,
    source: "GBEXAMPLESOURCEADDRESS1234567890",
    data: "test payload",
  },
  {
    tx_id: "tx-test-002",
    status: "PROCESSING",
    callback_url: "https://example.com/callback-2",
    created_at: 1729000200,
    updated_at: 1729000300,
    ledger: 12346,
    source: "GBEXAMPLESOURCEADDRESS0987654321",
    data: "second payload",
  },
];

const mockContractInfo: ContractInfo = {
  address: "CAEXAMPLECONTRACTADDRESS1234567890",
  network: "testnet",
  version: "0.1.0",
  balance: "100.50 XLM",
  admin: "GBADMINADDRESS1234567890",
  sequence: 42,
};

let mockTxsReturn: Transaction[] = mockTransactions;
let mockContractReturn: ContractInfo | null = mockContractInfo;

vi.mock("@/lib/soroban/useLiveTransactions", () => ({
  useLiveTransactions: () => mockTxsReturn,
}));

vi.mock("@/lib/soroban/useLiveContractInfo", () => ({
  useLiveContractInfo: () => mockContractReturn,
}));

// Mock wallet provider used by child components
vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => ({
    account: "GBEXAMPLEACCOUNT123",
    connected: true,
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), showToast: vi.fn() }),
  ToastProvider: ({ children }: any) => <>{children}</>,
}));

describe("DashboardTab Component (#300)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockTxsReturn = mockTransactions;
    mockContractReturn = mockContractInfo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading, error, and empty states", () => {
    it("renders loading message with role=status when loading=true", () => {
      render(<DashboardTab loading={true} />);
      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent("Loading dashboard…");
    });

    it("renders error alert with role=alert when error message is supplied", () => {
      render(<DashboardTab error="Network RPC unreachable" />);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Unable to load dashboard: Network RPC unreachable");
    });

    it("renders empty state when no transactions and no contract info exist", () => {
      mockTxsReturn = [];
      mockContractReturn = null;

      render(<DashboardTab />);
      expect(screen.getByTestId("empty-dashboard")).toHaveTextContent(
        "No dashboard activity is available yet."
      );
    });
  });

  describe("Layout controls & widget toggles", () => {
    it("renders layout controls with widget toggle checkboxes and move buttons", () => {
      render(<DashboardTab />);
      expect(screen.getByTestId("dashboard-layout-controls")).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: /Toggle Stat Cards visibility/i })
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: /Toggle Pipeline visibility/i })
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: /Toggle Platform Health visibility/i })
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: /Toggle Contract Info visibility/i })
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: /Toggle Recent Transactions visibility/i })
      ).toBeChecked();
      expect(screen.getByTestId("reset-layout-button")).toBeInTheDocument();
    });

    it("toggles widget visibility when checkbox is clicked", () => {
      render(<DashboardTab />);

      expect(screen.getByTestId("widget-container-statCards")).toBeInTheDocument();

      const statCardsCheckbox = screen.getByRole("checkbox", {
        name: /Toggle Stat Cards visibility/i,
      });
      fireEvent.click(statCardsCheckbox);

      expect(statCardsCheckbox).not.toBeChecked();
      expect(screen.queryByTestId("widget-container-statCards")).not.toBeInTheDocument();

      // Toggle back on
      fireEvent.click(statCardsCheckbox);
      expect(statCardsCheckbox).toBeChecked();
      expect(screen.getByTestId("widget-container-statCards")).toBeInTheDocument();
    });

    it("reorders widgets using arrow buttons", () => {
      render(<DashboardTab />);

      const moveDownButtons = screen.getAllByRole("button", { name: /Move .* down/i });
      expect(moveDownButtons.length).toBeGreaterThan(0);

      // Move top widget down
      fireEvent.click(moveDownButtons[0]!);

      // Reset layout button resets order
      const resetBtn = screen.getByTestId("reset-layout-button");
      fireEvent.click(resetBtn);
      expect(screen.getByTestId("widget-container-statCards")).toBeInTheDocument();
    });
  });

  describe("Drag and drop & transaction selection", () => {
    it("handles drag and drop events on widget container", () => {
      render(<DashboardTab />);

      const statCardContainer = screen.getByTestId("widget-container-statCards");
      const pipelineContainer = screen.getByTestId("widget-container-pipeline");

      const dataTransfer = {
        effectAllowed: "",
        dropEffect: "",
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("statCards"),
      };

      fireEvent.dragStart(statCardContainer, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "statCards");

      fireEvent.dragOver(pipelineContainer, { dataTransfer });
      fireEvent.drop(pipelineContainer, { dataTransfer });
      fireEvent.dragEnd(statCardContainer);

      expect(screen.getByTestId("widget-container-pipeline")).toBeInTheDocument();
    });
  });
});
