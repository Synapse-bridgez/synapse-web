import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { getStoredWalletId } from "./storage";
import { getE2EMocks } from "@/lib/e2e";

export { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

let initialized = false;

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined" || getE2EMocks()?.wallet) return;

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules: [new FreighterModule(), new xBullModule()],
  });

  initialized = true;
}

export function walletAuthModal(): Promise<void> {
  const wallet = getE2EMocks()?.wallet;
  return wallet ? wallet.authModal() : StellarWalletsKit.authModal({});
}

export function walletGetAddress(): Promise<{ address: string }> {
  const wallet = getE2EMocks()?.wallet;
  return wallet ? wallet.getAddress() : StellarWalletsKit.getAddress();
}

export function walletDisconnect(): Promise<void> {
  const wallet = getE2EMocks()?.wallet;
  return wallet ? wallet.disconnect() : StellarWalletsKit.disconnect();
}

export function getSelectedWalletProductId(): string {
  return (
    getE2EMocks()?.wallet?.selectedModule.productId ?? StellarWalletsKit.selectedModule.productId
  );
}

export { StellarWalletsKit };
