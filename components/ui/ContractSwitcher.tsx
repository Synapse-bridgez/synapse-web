"use client";

import { useMemo } from "react";
import { selectContract } from "../../lib/soroban/contractSelection";

export interface ContractOption {
  id: string;
  name?: string;
}

export interface ContractSwitcherProps {
  contracts: readonly ContractOption[];
  storedId: string | null | undefined;
  onSelect: (id: string) => void;
}

export function ContractSwitcher({
  contracts,
  storedId,
  onSelect,
}: ContractSwitcherProps) {
  const selection = useMemo(
    () => selectContract(storedId, contracts),
    [storedId, contracts],
  );

  if (selection.status === "missing") {
    return (
      <div className="contract-switcher contract-switcher--missing" role="alert">
        <p>
          The previously selected contract <code>{selection.storedId}</code> could
          not be found.
        </p>
        <select
          aria-label="Select a contract"
          value=""
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="" disabled>
            Select a contract
          </option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name ?? contract.id}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selectedId = selection.contract?.id ?? "";

  return (
    <select
      className="contract-switcher"
      aria-label="Select a contract"
      value={selectedId}
      onChange={(event) => onSelect(event.target.value)}
    >
      {selection.status === "none" && !selection.contract ? (
        <option value="" disabled>
          No contracts available
        </option>
      ) : null}
      {contracts.map((contract) => (
        <option key={contract.id} value={contract.id}>
          {contract.name ?? contract.id}
        </option>
      ))}
    </select>
  );
}
