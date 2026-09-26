import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { getStoredWalletId } from "./storage";

export { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

let initialized = false;

/**
 * WalletConnect requires a project id issued by the WalletConnect Cloud.
 * It is read from the public env var so the same build can target different
 * relay projects without code changes.
 */
const WALLETCONNECT_PROJECT_ID =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) || "";

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;

  const modules = [new FreighterModule(), new xBullModule()];

  // Only register WalletConnect when a project id is configured; otherwise
  // the module would fail to open a relay session and break the connect flow.
  if (WALLETCONNECT_PROJECT_ID) {
    modules.push(
      new WalletConnectModule({
        projectId: WALLETCONNECT_PROJECT_ID,
        name: "Stellar Dashboard",
        description: "Connect a mobile Stellar wallet via WalletConnect",
        url: typeof window !== "undefined" ? window.location.origin : "",
        icons: [],
      }),
    );
  }

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules,
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
