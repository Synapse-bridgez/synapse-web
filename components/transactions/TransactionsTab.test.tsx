import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Collaborator mocks ----------------------------------------------------
// TransactionsTab talks to the wallet, the Soroban contract and a live feed.
// Each is mocked so these tests exercise only the tab's own rendering and
// interaction logic.

type Tx = {
  id: string;
  status: string;
  asset: string;
  memo: string;
  amount: number;
};

const mocks = vi.hoisted(() => ({
  txs: [] as Tx[],
  wallet: { address: null as string | null, connect: vi.fn() },
  toast: vi.fn(),
  simulateContractCall: vi.fn(),
  invokeContract: vi.fn(),
  config: { rpcUrl: "https://rpc.test", contractId: "CCONTRACT" as string | undefined },
}));

vi.mock("@/lib/config", () => ({
  get appConfig() {
    return mocks.config;
  },
}));

vi.mock("@/lib/soroban/useLiveTransactions", () => ({
  useLiveTransactions: () => mocks.txs,
}));

vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => mocks.wallet,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/lib/soroban/contract", () => ({
  simulateContractCall: (...args: unknown[]) => mocks.simulateContractCall(...args),
  invokeContract: (...args: unknown[]) => mocks.invokeContract(...args),
  stringArg: (v: string) => ({ kind: "string", v }),
  structArg: (v: Record<string, string>) => ({ kind: "struct", v }),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  scValToNative: (v: unknown) => v,
}));

vi.mock("@/lib/utils", () => ({
  shortId: (id: string) => id.slice(0, 6),
}));

vi.mock("@/components/wallet/OriginBadge", () => ({
  SigningOriginNote: () => <div data-testid="signing-origin-note" />,
}));

vi.mock("./TxTable", () => ({
  TxTable: ({ txs, onSelect }: { txs: Tx[]; onSelect: (tx: Tx) => void }) => (
    <ul data-testid="tx-table">
      {txs.map((tx) => (
        <li key={tx.id}>
          <button type="button" onClick={() => onSelect(tx)}>
            row {tx.id}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

vi.mock("./TxDetailModal", () => ({
  TxDetailModal: ({ tx, onClose }: { tx: Tx; onClose: () => void }) => (
    <div role="dialog" aria-label={`details ${tx.id}`}>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

import { TransactionsTab } from "./TransactionsTab";

// --- Helpers -----------------------------------------------------------------

const makeTx = (overrides: Partial<Tx> = {}): Tx => ({
  id: "tx-0000",
  status: "PENDING",
  asset: "USDC",
  memo: "",
  amount: 10,
  ...overrides,
});

const FILTER_PLACEHOLDER = "filter by tx_id · status · asset · memo…";

function filterInput() {
  return screen.getByPlaceholderText(FILTER_PLACEHOLDER);
}

function visibleRowIds() {
  return Array.from(screen.getByTestId("tx-table").querySelectorAll("button")).map((b) =>
    b.textContent?.replace("row ", "")
  );
}

/**
 * CONTRACT_ID is read once when TransactionsTab.tsx loads, so the
 * "not configured" path needs a fresh copy of the module.
 */
async function renderWithoutContractId() {
  mocks.config.contractId = undefined;
  vi.resetModules();
  const { TransactionsTab: Fresh } = await import("./TransactionsTab");
  return render(<Fresh />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.txs = [];
  mocks.wallet.address = "GADDRESS";
  mocks.wallet.connect = vi.fn().mockResolvedValue(undefined);
  mocks.config.contractId = "CCONTRACT";
});

// --- Tests ---------------------------------------------------------------------

describe("TransactionsTab — rendering", () => {
  it("renders the lookup, table and callback panels", () => {
    render(<TransactionsTab />);

    expect(screen.getByText("TRANSACTION LOOKUP")).toBeInTheDocument();
    expect(screen.getByText("ALL TRANSACTIONS (0)")).toBeInTheDocument();
    expect(screen.getByText("REGISTER CALLBACK")).toBeInTheDocument();
    expect(filterInput()).toHaveValue("");
    expect(screen.getByRole("button", { name: "LOOKUP →" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "REGISTER CALLBACK →" })).toBeEnabled();
    expect(screen.getByLabelText("secret")).toHaveAttribute("type", "password");
    expect(screen.getByTestId("signing-origin-note")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows every live transaction and its count when unfiltered", () => {
    mocks.txs = [makeTx({ id: "aaa" }), makeTx({ id: "bbb" }), makeTx({ id: "ccc" })];
    render(<TransactionsTab />);

    expect(screen.getByText("ALL TRANSACTIONS (3)")).toBeInTheDocument();
    expect(visibleRowIds()).toEqual(["aaa", "bbb", "ccc"]);
  });
});

describe("TransactionsTab — filtering", () => {
  beforeEach(() => {
    mocks.txs = [
      makeTx({ id: "abc-111", status: "COMPLETED", asset: "USDC", memo: "rent" }),
      makeTx({ id: "def-222", status: "FAILED", asset: "XLM", memo: "invoice-42" }),
      makeTx({ id: "ghi-333", status: "PENDING", asset: "EURC", memo: "" }),
    ];
  });

  it.each([
    ["tx_id substring", "def", ["def-222"]],
    ["status, case-insensitively", "failed", ["def-222"]],
    ["asset, case-insensitively", "eurc", ["ghi-333"]],
    ["memo substring", "invoice", ["def-222"]],
  ])("filters by %s", async (_label, query, expected) => {
    const user = userEvent.setup();
    render(<TransactionsTab />);

    await user.type(filterInput(), query);

    expect(visibleRowIds()).toEqual(expected);
    expect(screen.getByText(`ALL TRANSACTIONS (${expected.length})`)).toBeInTheDocument();
  });

  it("shows an empty table when nothing matches", async () => {
    const user = userEvent.setup();
    render(<TransactionsTab />);

    await user.type(filterInput(), "zzz-no-match");

    expect(visibleRowIds()).toEqual([]);
    expect(screen.getByText("ALL TRANSACTIONS (0)")).toBeInTheDocument();
  });
});

describe("TransactionsTab — detail modal", () => {
  it("opens the detail modal for the selected row and closes it", async () => {
    const user = userEvent.setup();
    mocks.txs = [makeTx({ id: "aaa" }), makeTx({ id: "bbb" })];
    render(<TransactionsTab />);

    await user.click(screen.getByRole("button", { name: "row bbb" }));
    expect(screen.getByRole("dialog", { name: "details bbb" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("TransactionsTab — get_transaction lookup", () => {
  it("asks for a tx_id when the filter is blank", async () => {
    const user = userEvent.setup();
    render(<TransactionsTab />);

    await user.type(filterInput(), "   ");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    expect(mocks.toast).toHaveBeenCalledWith("Enter a tx_id to look up", "error");
    expect(mocks.simulateContractCall).not.toHaveBeenCalled();
  });

  it("reports a missing contract id", async () => {
    const user = userEvent.setup();
    await renderWithoutContractId();

    await user.type(filterInput(), "abc");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    expect(mocks.toast).toHaveBeenCalledWith("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
    expect(mocks.simulateContractCall).not.toHaveBeenCalled();
  });

  it("prompts a wallet connection when no wallet is connected", async () => {
    const user = userEvent.setup();
    mocks.wallet.address = null;
    render(<TransactionsTab />);

    await user.type(filterInput(), "abc");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    expect(mocks.toast).toHaveBeenCalledWith(
      "Connect a wallet to run this read-only lookup",
      "error"
    );
    expect(mocks.wallet.connect).toHaveBeenCalledTimes(1);
    expect(mocks.simulateContractCall).not.toHaveBeenCalled();
  });

  it("simulates get_transaction with the trimmed id and shows the result", async () => {
    const user = userEvent.setup();
    mocks.simulateContractCall.mockResolvedValue({ result: { retval: { status: "ok" } } });
    render(<TransactionsTab />);

    await user.type(filterInput(), "  abcdef123  ");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith('get_transaction(abcdef) → {"status":"ok"}', "info")
    );
    expect(mocks.simulateContractCall).toHaveBeenCalledWith(
      "https://rpc.test",
      "CCONTRACT",
      "GADDRESS",
      "get_transaction",
      [{ kind: "string", v: "abcdef123" }]
    );
  });

  it("shows a busy state while the lookup is in flight", async () => {
    const user = userEvent.setup();
    let finish!: (v: unknown) => void;
    mocks.simulateContractCall.mockReturnValue(new Promise((r) => (finish = r)));
    render(<TransactionsTab />);

    await user.type(filterInput(), "abc");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    expect(screen.getByRole("button", { name: "LOOKING UP…" })).toBeDisabled();

    finish({ result: undefined });
    expect(await screen.findByRole("button", { name: "LOOKUP →" })).toBeEnabled();
  });

  it("surfaces simulation errors", async () => {
    const user = userEvent.setup();
    mocks.simulateContractCall.mockRejectedValue(new Error("RPC unreachable"));
    render(<TransactionsTab />);

    await user.type(filterInput(), "abc");
    await user.click(screen.getByRole("button", { name: "LOOKUP →" }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("RPC unreachable", "error"));
    expect(screen.getByRole("button", { name: "LOOKUP →" })).toBeEnabled();
  });
});

describe("TransactionsTab — register_callback", () => {
  async function fillCallbackForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("tx_id"), " tx-1 ");
    await user.type(screen.getByLabelText("callback_url"), "https://hook.test/cb");
    await user.type(screen.getByLabelText("secret"), "s3cret");
  }

  it("requires all three fields", async () => {
    const user = userEvent.setup();
    render(<TransactionsTab />);

    await user.type(screen.getByLabelText("tx_id"), "tx-1");
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    expect(mocks.toast).toHaveBeenCalledWith(
      "tx_id, callback_url, and secret are all required",
      "error"
    );
    expect(mocks.invokeContract).not.toHaveBeenCalled();
  });

  it("reports a missing contract id", async () => {
    const user = userEvent.setup();
    await renderWithoutContractId();

    await fillCallbackForm(user);
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    expect(mocks.toast).toHaveBeenCalledWith("NEXT_PUBLIC_CONTRACT_ID is not configured", "error");
    expect(mocks.invokeContract).not.toHaveBeenCalled();
  });

  it("prompts a wallet connection before signing", async () => {
    const user = userEvent.setup();
    mocks.wallet.address = null;
    render(<TransactionsTab />);

    await fillCallbackForm(user);
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    expect(mocks.toast).toHaveBeenCalledWith(
      "Connect a wallet before registering a callback",
      "error"
    );
    expect(mocks.wallet.connect).toHaveBeenCalledTimes(1);
    expect(mocks.invokeContract).not.toHaveBeenCalled();
  });

  it("submits the trimmed payload and clears the form on success", async () => {
    const user = userEvent.setup();
    mocks.invokeContract.mockResolvedValue({ status: "SUCCESS", hash: "hash1234567" });
    render(<TransactionsTab />);

    await fillCallbackForm(user);
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        "register_callback() succeeded · tx hash12",
        "success"
      )
    );
    expect(mocks.invokeContract).toHaveBeenCalledWith(
      "https://rpc.test",
      "CCONTRACT",
      "GADDRESS",
      "register_callback",
      [
        {
          kind: "struct",
          v: { tx_id: "tx-1", callback_url: "https://hook.test/cb", secret: "s3cret" },
        },
      ]
    );
    expect(screen.getByLabelText("tx_id")).toHaveValue("");
    expect(screen.getByLabelText("callback_url")).toHaveValue("");
    expect(screen.getByLabelText("secret")).toHaveValue("");
  });

  it("keeps the form filled when the transaction fails", async () => {
    const user = userEvent.setup();
    mocks.invokeContract.mockResolvedValue({ status: "FAILED", hash: "hashfail99" });
    render(<TransactionsTab />);

    await fillCallbackForm(user);
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith("register_callback() failed · tx hashfa", "error")
    );
    expect(screen.getByLabelText("callback_url")).toHaveValue("https://hook.test/cb");
  });

  it("shows a submitting state, then surfaces thrown errors", async () => {
    const user = userEvent.setup();
    let fail!: (e: Error) => void;
    mocks.invokeContract.mockReturnValue(new Promise((_, rej) => (fail = rej)));
    render(<TransactionsTab />);

    await fillCallbackForm(user);
    await user.click(screen.getByRole("button", { name: "REGISTER CALLBACK →" }));

    expect(screen.getByRole("button", { name: "SUBMITTING…" })).toBeDisabled();

    fail(new Error("User rejected signature"));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith("User rejected signature", "error")
    );
    expect(screen.getByRole("button", { name: "REGISTER CALLBACK →" })).toBeEnabled();
  });
});
