"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ensureWalletKitInitialized,
  StellarWalletsKit,
  storeSelectedWalletId,
  clearSelectedWalletId,
  getStoredWalletId,
} from "./kit";

/**
 * Dashboard-configured network passphrase. The dashboard targets Testnet, so a
 * wallet reporting any other passphrase is considered a mismatch.
 */
export const DASHBOARD_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

export type NetworkStatus = "match" | "mismatch" | "unknown";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  error: string | null;
  /** Wallet-reported network passphrase, or null when the wallet doesn't expose it. */
  networkPassphrase: string | null;
  /** Comparison of the wallet network against the dashboard's configured network. */
  networkStatus: NetworkStatus;
  /** Human-readable warning for mismatch/unknown states, or null when matched. */
  networkWarning: string | null;
  /** Re-checks the wallet network; returns the resulting status. */
  checkNetwork: () => Promise<NetworkStatus>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connecting: false,
  error: null,
  networkPassphrase: null,
  networkStatus: "unknown",
  networkWarning: null,
  checkNetwork: async () => "unknown",
  connect: async () => {},
  disconnect: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function compareNetwork(walletPassphrase: string | null): NetworkStatus {
  if (!walletPassphrase) return "unknown";
  return walletPassphrase === DASHBOARD_NETWORK_PASSPHRASE ? "match" : "mismatch";
}

function warningFor(status: NetworkStatus, walletPassphrase: string | null): string | null {
  if (status === "mismatch") {
    return `Your wallet is connected to a different network than this dashboard. This dashboard targets "${DASHBOARD_NETWORK_PASSPHRASE}", but your wallet reports "${walletPassphrase}". Please switch networks in your wallet extension before submitting.`;
  }
  if (status === "unknown") {
    return "Your wallet did not report its active network. Network unknown — proceed with caution and confirm your wallet is on the correct network before submitting.";
  }
  return null;
}

async function readWalletNetworkPassphrase(): Promise<string | null> {
  try {
    const kit = StellarWalletsKit as unknown as {
      getNetwork?: () => Promise<{ networkPassphrase?: string } | string>;
    };
    if (typeof kit.getNetwork !== "function") return null;
    const result = await kit.getNetwork();
    if (typeof result === "string") return result || null;
    return result?.networkPassphrase ?? null;
  } catch {
    // Wallet doesn't expose network info or the call failed — degrade to unknown.
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("unknown");

  const applyNetwork = useCallback((passphrase: string | null) => {
    const status = compareNetwork(passphrase);
    setNetworkPassphrase(passphrase);
    setNetworkStatus(status);
    return status;
  }, []);

  const checkNetwork = useCallback(async () => {
    const passphrase = await readWalletNetworkPassphrase();
    return applyNetwork(passphrase);
  }, [applyNetwork]);

  useEffect(() => {
    ensureWalletKitInitialized();
    if (!getStoredWalletId()) return;

    let cancelled = false;
    StellarWalletsKit.getAddress()
      .then(async ({ address: restoredAddress }) => {
        if (cancelled) return;
        setAddress(restoredAddress);
        const passphrase = await readWalletNetworkPassphrase();
        if (!cancelled) applyNetwork(passphrase);
      })
      .catch(() => {
        clearSelectedWalletId();
      });
    return () => {
      cancelled = true;
    };
  }, [applyNetwork]);

  const connect = useCallback(async () => {
    ensureWalletKitInitialized();
    setConnecting(true);
    setError(null);
    try {
      await StellarWalletsKit.authModal({});
      const { address: connectedAddress } = await StellarWalletsKit.getAddress();
      setAddress(connectedAddress);
      storeSelectedWalletId(StellarWalletsKit.selectedModule.productId);
      // Compare the wallet-reported network against the dashboard config on connect.
      const passphrase = await readWalletNetworkPassphrase();
      applyNetwork(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [applyNetwork]);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // Some modules don't implement disconnect(); local state is cleared regardless.
    }
    clearSelectedWalletId();
    setAddress(null);
    setNetworkPassphrase(null);
    setNetworkStatus("unknown");
  }, []);

  const networkWarning = warningFor(networkStatus, networkPassphrase);

  return (
    <WalletContext.Provider
      value={{
        address,
        connecting,
        error,
        networkPassphrase,
        networkStatus,
        networkWarning,
        checkNetwork,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
