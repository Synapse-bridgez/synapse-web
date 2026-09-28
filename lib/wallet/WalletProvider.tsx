"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ensureWalletKitInitialized,
  walletAuthModal,
  walletGetAddress,
  walletDisconnect,
  getSelectedWalletProductId,
  storeSelectedWalletId,
  clearSelectedWalletId,
  getStoredWalletId,
} from "./kit";
import { getE2EMocks } from "@/lib/e2e";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureWalletKitInitialized();
    if (getE2EMocks()?.wallet || !getStoredWalletId()) return;

    let cancelled = false;
    walletGetAddress()
      .then(({ address: restoredAddress }) => {
        if (!cancelled) setAddress(restoredAddress);
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
      await walletAuthModal();
      const { address: connectedAddress } = await walletGetAddress();
      setAddress(connectedAddress);
      storeSelectedWalletId(getSelectedWalletProductId());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await walletDisconnect();
    } catch {
      // Some modules don't implement disconnect(); local state is cleared regardless.
    }
    clearSelectedWalletId();
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
