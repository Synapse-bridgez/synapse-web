const SELECTED_WALLET_KEY = "synapse-selected-wallet-id";
const WALLETCONNECT_SESSION_KEY = "synapse-walletconnect-session";

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

export interface StoredWalletConnectSession {
  topic: string;
  pairingTopic?: string;
  address?: string;
  chainId?: string;
  expiry?: number;
}

export function getStoredWalletConnectSession(): StoredWalletConnectSession | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(WALLETCONNECT_SESSION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredWalletConnectSession;
    if (!parsed || typeof parsed.topic !== "string") return undefined;
    if (typeof parsed.expiry === "number" && parsed.expiry <= Date.now()) {
      clearStoredWalletConnectSession();
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function storeWalletConnectSession(session: StoredWalletConnectSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WALLETCONNECT_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearStoredWalletConnectSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLETCONNECT_SESSION_KEY);
  } catch {}
}
