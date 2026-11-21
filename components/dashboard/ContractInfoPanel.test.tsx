import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractInfoPanel } from "./ContractInfoPanel";
import type { ContractInfo } from "@/lib/types";

const useLiveContractInfo = vi.fn();
vi.mock("@/lib/soroban/useLiveContractInfo", () => ({
  useLiveContractInfo: () => useLiveContractInfo(),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => ({ address: null }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/soroban/SorobanProvider", () => ({
  useSoroban: () => ({ contractId: null }),
  SorobanProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const info: ContractInfo = {
  version: "1.2.3",
  network: "testnet",
  address: "CABC",
  admin: "GADMIN",
  relay_signer: "GRELAY",
  health: "ok",
};

describe("ContractInfoPanel", () => {
  beforeEach(() => useLiveContractInfo.mockReturnValue(info));

  it("renders every contract field", () => {
    render(<ContractInfoPanel />);
    for (const value of Object.values(info)) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText("Relay signer")).toBeInTheDocument();
  });

  it("offers copy buttons for addresses only", () => {
    render(<ContractInfoPanel />);
    expect(screen.getByRole("button", { name: "Copy Contract" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Relay signer" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("shows a placeholder and no copy button for empty fields", () => {
    useLiveContractInfo.mockReturnValue({ ...info, admin: "", health: "" });
    render(<ContractInfoPanel />);
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Copy Admin" })).toBeNull();
  });
});
