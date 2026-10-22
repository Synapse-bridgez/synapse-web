import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContractSwitcher } from "./ContractSwitcher";

const toastMock = vi.fn();
const setContractIdMock = vi.fn();
const addContractMock = vi.fn();
const removeContractMock = vi.fn();

let selectionState: {
  contractId: string | undefined;
  availableContracts: { id: string; name: string; isCustom?: boolean }[];
};

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/soroban/SorobanProvider", () => ({
  useContractSelection: () => ({
    contractId: selectionState.contractId,
    setContractId: setContractIdMock,
    availableContracts: selectionState.availableContracts,
    addContract: addContractMock,
    removeContract: removeContractMock,
  }),
}));

describe("ContractSwitcher", () => {
  beforeEach(() => {
    toastMock.mockClear();
    setContractIdMock.mockClear();
    addContractMock.mockClear();
    removeContractMock.mockClear();
    selectionState = {
      contractId: "CONTRACT_A",
      availableContracts: [
        { id: "CONTRACT_A", name: "Contract A" },
        { id: "CONTRACT_B", name: "Contract B", isCustom: true },
      ],
    };
  });

  it("shows the selected contract's name on the trigger button", () => {
    render(<ContractSwitcher />);
    expect(screen.getByText("Contract A")).toBeInTheDocument();
  });

  it("shows 'No Contract' when nothing is selected", () => {
    selectionState.contractId = undefined;
    render(<ContractSwitcher />);
    expect(screen.getByText("No Contract")).toBeInTheDocument();
  });

  it("opens the dropdown and lists the available contracts", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));

    expect(screen.getByText("TRACKED CONTRACTS")).toBeInTheDocument();
    expect(screen.getByText("Contract A")).toBeInTheDocument();
    expect(screen.getByText("Contract B")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no tracked contracts", () => {
    selectionState.availableContracts = [];
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));

    expect(screen.getByText("No contracts configured yet. Add one below.")).toBeInTheDocument();
  });

  it("switches contract and closes the dropdown when a different contract is selected", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    fireEvent.click(screen.getByText("Contract B"));

    expect(setContractIdMock).toHaveBeenCalledWith("CONTRACT_B");
    expect(toastMock).toHaveBeenCalledWith("Switched contract to Contract B", "info");
    expect(screen.queryByText("TRACKED CONTRACTS")).not.toBeInTheDocument();
  });

  it("does not call setContractId when the already-selected contract is clicked", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    fireEvent.click(screen.getByText("Contract A"));

    expect(setContractIdMock).not.toHaveBeenCalled();
  });

  it("opens the add-contract form and rejects an empty id", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    fireEvent.click(screen.getByText("+ ADD CONTRACT ID"));

    fireEvent.click(screen.getByText("Save & Switch"));

    expect(toastMock).toHaveBeenCalledWith("Contract ID cannot be empty", "error");
    expect(addContractMock).not.toHaveBeenCalled();
  });

  it("adds and switches to a new contract with a trimmed id and name", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    fireEvent.click(screen.getByText("+ ADD CONTRACT ID"));

    fireEvent.change(screen.getByPlaceholderText(/Contract ID/i), {
      target: { value: "  CONTRACT_C  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/Label/i), {
      target: { value: "  My Contract  " },
    });
    fireEvent.click(screen.getByText("Save & Switch"));

    expect(addContractMock).toHaveBeenCalledWith({
      id: "CONTRACT_C",
      name: "My Contract",
      isCustom: true,
    });
    expect(setContractIdMock).toHaveBeenCalledWith("CONTRACT_C");
    expect(toastMock).toHaveBeenCalledWith("Added and switched to My Contract", "success");
  });

  it("falls back to a generated name when no label is given", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    fireEvent.click(screen.getByText("+ ADD CONTRACT ID"));

    fireEvent.change(screen.getByPlaceholderText(/Contract ID/i), {
      target: { value: "CONTRACT_C" },
    });
    fireEvent.click(screen.getByText("Save & Switch"));

    expect(addContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "CONTRACT_C", isCustom: true })
    );
  });

  it("removes a custom contract without selecting it", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));

    fireEvent.click(screen.getByTitle("Remove contract"));

    expect(removeContractMock).toHaveBeenCalledWith("CONTRACT_B");
    expect(toastMock).toHaveBeenCalledWith("Removed contract Contract B", "info");
    expect(setContractIdMock).not.toHaveBeenCalled();
  });

  it("closes the dropdown on an outside click", () => {
    render(<ContractSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /CONTRACT:/i }));
    expect(screen.getByText("TRACKED CONTRACTS")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("TRACKED CONTRACTS")).not.toBeInTheDocument();
  });
});
