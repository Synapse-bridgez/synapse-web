const SELECTED_WALLET_KEY = "synapse-selected-wallet-id";

export function getStoredWalletId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(SELECTED_WALLET_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function storeSelectedWalletId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_WALLET_KEY, id);
  } catch {}
}

export function clearSelectedWalletId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SELECTED_WALLET_KEY);
  } catch {}
}
