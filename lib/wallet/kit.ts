import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { getStoredWalletId } from "./storage";

export { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

let initialized = false;

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules: [new FreighterModule(), new xBullModule()],
  });

  initialized = true;
}

/**
 * Enumerate the accounts the currently connected extension exposes.
 *
 * Not every wallet supports multi-account enumeration. When the underlying
 * module does not implement `getAccounts` (or throws), we return an empty
 * list so consumers can hide the account switcher entirely instead of
 * rendering a broken empty state.
 */
export async function getWalletAccounts(): Promise<string[]> {
  ensureWalletKitInitialized();

  const kit = StellarWalletsKit as unknown as {
    getAccounts?: () => Promise<{ address: string }[]>;
  };

  if (typeof kit.getAccounts !== "function") {
    return [];
  }

  try {
    const accounts = await kit.getAccounts();
    if (!Array.isArray(accounts)) return [];
    return accounts
      .map((account) => account?.address)
      .filter((address): address is string => typeof address === "string" && address.length > 0);
  } catch {
    return [];
  }
}

export { StellarWalletsKit };
