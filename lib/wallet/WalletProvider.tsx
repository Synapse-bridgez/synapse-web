"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ensureWalletKitInitialized,
  StellarWalletsKit,
  storeSelectedWalletId,
  clearSelectedWalletId,
  getStoredWalletId,
} from "./kit";

interface WalletContextValue {
  address: string | null;
  accounts: string[];
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchAccount: (account: string) => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  accounts: [],
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  switchAccount: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

/**
 * Best-effort enumeration of the accounts the connected extension exposes.
 * Wallets that don't support multi-account enumeration return a single
 * account (or throw), in which case the switcher stays hidden.
 */
async function enumerateAccounts(activeAddress: string): Promise<string[]> {
  try {
    const kit = StellarWalletsKit as unknown as {
      getNetwork?: () => Promise<unknown>;
      getAccounts?: () => Promise<string[]>;
    };
    if (typeof kit.getAccounts === "function") {
      const accounts = await kit.getAccounts();
      if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts.includes(activeAddress) ? accounts : [activeAddress, ...accounts];
      }
    }
  } catch {
    // Extension doesn't support enumeration; fall through to single account.
  }
  return [activeAddress];
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureWalletKitInitialized();
    if (!getStoredWalletId()) return;

    let cancelled = false;
    StellarWalletsKit.getAddress()
      .then(async ({ address: restoredAddress }) => {
        if (cancelled) return;
        setAddress(restoredAddress);
        const enumerated = await enumerateAccounts(restoredAddress);
        if (!cancelled) setAccounts(enumerated);
      })
      .catch(() => {
        clearSelectedWalletId();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    ensureWalletKitInitialized();
    setConnecting(true);
    setError(null);
    try {
      await StellarWalletsKit.authModal({});
      const { address: connectedAddress } = await StellarWalletsKit.getAddress();
      setAddress(connectedAddress);
      setAccounts(await enumerateAccounts(connectedAddress));
      storeSelectedWalletId(StellarWalletsKit.selectedModule.productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // Some modules don't implement disconnect(); local state is cleared regardless.
    }
    clearSelectedWalletId();
    setAddress(null);
    setAccounts([]);
  }, []);

  const switchAccount = useCallback((account: string) => {
    setAccounts((current) => (current.includes(account) ? current : [...current, account]));
    setAddress(account);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, accounts, connecting, error, connect, disconnect, switchAccount }}
    >
      {children}
    </WalletContext.Provider>
  );
}
