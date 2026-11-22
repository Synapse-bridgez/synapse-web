import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContractInfoPanel } from "./ContractInfoPanel";
import type { ContractInfo } from "@/lib/types";

const wallet = { address: null as string | null, network: "testnet", lastSubmittedAt: 0 };
vi.mock("@/lib/wallet/WalletProvider", () => ({ useWallet: () => wallet }));

const info: ContractInfo = {
  version: "1.2.3",
  network: "testnet",
  address: "CCONTRACT",
  admin: "GADMIN",
  relay_signer: "GRELAY",
  health: "ok",
};

const fetchMock = vi.fn();

function respond(status: number, body: unknown = {}) {
  fetchMock.mockResolvedValue({ status, ok: status >= 200 && status < 300, json: async () => body });
}

describe("ContractInfoPanel", () => {
  beforeEach(() => {
    wallet.address = null;
    wallet.network = "testnet";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders every contract field and an idle balance without a wallet", () => {
    render(<ContractInfoPanel info={info} />);
    for (const v of Object.values(info)) expect(screen.getAllByText(v).length).toBeGreaterThan(0);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the XLM balance and non-native assets from Horizon for the wallet's network", async () => {
    wallet.address = "GWALLET";
    wallet.network = "mainnet";
    respond(200, {
      balances: [
        { asset_type: "native", balance: "25.5" },
        { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "10.0000000" },
      ],
    });
    render(<ContractInfoPanel info={info} />);
    expect(await screen.findByText(/25\.50 XLM/)).toBeInTheDocument();
    expect(screen.getByText("USDC")).toBeInTheDocument();
    expect(screen.getByText("10.0000000")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("https://horizon.stellar.org/accounts/GWALLET");
    expect(screen.queryByText(/low balance/)).not.toBeInTheDocument();
  });

  it("warns when the balance is below the fee threshold", async () => {
    wallet.address = "GWALLET";
    respond(200, { balances: [{ asset_type: "native", balance: "0.5" }] });
    render(<ContractInfoPanel info={info} />);
    expect(await screen.findByText(/low balance/)).toBeInTheDocument();
  });

  it("shows the unfunded state and friendbot tip on a 404", async () => {
    wallet.address = "GWALLET";
    respond(404);
    render(<ContractInfoPanel info={info} />);
    expect(await screen.findByText("account not funded")).toBeInTheDocument();
    expect(screen.getByText(/fund it via friendbot/)).toBeInTheDocument();
  });

  it("shows Horizon HTTP errors", async () => {
    wallet.address = "GWALLET";
    respond(500);
    render(<ContractInfoPanel info={info} />);
    expect(await screen.findByText("error: Horizon responded 500")).toBeInTheDocument();
  });

  it("shows network failures", async () => {
    wallet.address = "GWALLET";
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<ContractInfoPanel info={info} />);
    expect(await screen.findByText("error: offline")).toBeInTheDocument();
  });

  it("falls back to testnet Horizon for an unknown network", async () => {
    wallet.address = "GWALLET";
    wallet.network = "standalone";
    respond(200, { balances: [] });
    render(<ContractInfoPanel info={info} />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("https://horizon-testnet.stellar.org/accounts/GWALLET")
    );
  });
});
