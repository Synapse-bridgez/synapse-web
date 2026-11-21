export type ContractSelectionResult<T> =
  | { status: "found"; contract: T }
  | { status: "missing"; storedId: string }
  | { status: "none"; contract: T | undefined };

export interface SelectableContract {
  id: string;
}

/**
 * Resolve which contract should be selected given the persisted id and the
 * freshly fetched list of contracts.
 *
 * - `found`: the stored id exists in the list.
 * - `missing`: a stored id was provided but is not present in the list. The
 *   caller must surface an explicit "not found" state instead of silently
 *   selecting a different contract.
 * - `none`: no stored id at all; falling back to the first contract is fine.
 */
export function selectContract<T extends SelectableContract>(
  storedId: string | null | undefined,
  contracts: readonly T[],
): ContractSelectionResult<T> {
  if (!storedId) {
    return { status: "none", contract: contracts[0] };
  }

  const match = contracts.find((contract) => contract.id === storedId);
  if (match) {
    return { status: "found", contract: match };
  }

  return { status: "missing", storedId };
}
