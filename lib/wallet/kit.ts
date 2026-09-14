import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";

const SELECTED_WALLET_KEY = "synapse-selected-wallet-id";

let initialized = false;

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

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules: [new FreighterModule(), new xBullModule()],
  });

  initialized = true;
}

export { StellarWalletsKit };
