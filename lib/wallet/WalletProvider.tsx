"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ensureWalletKitInitialized,
  StellarWalletsKit,
  storeSelectedWalletId,
  clearSelectedWalletId,
  getStoredWalletId,
  isWalletConnectModule,
} from "./kit";

interface WalletContextValue {
  address: string | null;
  accounts: string[];
  connecting: boolean;
  error: string | null;
  /**
   * True while a WalletConnect pairing is in progress (QR shown / deep link
   * opened). Consumers can use this to render the pairing UI.
   */
  pairing: boolean;
  /**
   * URI to render as a QR code (desktop) or open as a deep link (mobile) while
   * pairing via WalletConnect. Null when not pairing.
   */
  pairingUri: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchAccount: (account: string) => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  accounts: [],
  connecting: false,
  error: null,
  pairing: false,
  pairingUri: null,
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

/**
 * WalletConnect exposes a pairing URI (wc:...) that must be rendered as a QR
 * code on desktop or opened as a deep link on mobile. The kit surfaces it via
 * the module's `getQrCode`/`getUri` helpers depending on version, so we probe
 * both and fall back to null when neither is available.
 */
async function getPairingUri(): Promise<string | null> {
  try {
    const module = StellarWalletsKit.selectedModule as unknown as {
      getQrCode?: () => Promise<{ uri?: string } | string>;
      getUri?: () => Promise<string> | string;
    };
    if (typeof module.getUri === "function") {
      const uri = await module.getUri();
      if (typeof uri === "string" && uri.length > 0) return uri;
    }
    if (typeof module.getQrCode === "function") {
      const qr = await module.getQrCode();
      if (typeof qr === "string" && qr.length > 0) return qr;
      if (qr && typeof qr === "object" && typeof qr.uri === "string") return qr.uri;
    }
  } catch {
    // Module doesn't expose a pairing URI; nothing to render.
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [pairingUri, setPairingUri] = useState<string | null>(null);

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
        // Session expired or relay disconnected: clear the stale session and
        // surface a reconnect prompt instead of silently failing.
        clearSelectedWalletId();
        if (!cancelled) {
          setError("Wallet session expired. Please reconnect.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    ensureWalletKitInitialized();
    setConnecting(true);
    setError(null);
    setPairingUri(null);
    try {
      await StellarWalletsKit.authModal({});
      const selected = StellarWalletsKit.selectedModule;
      const walletConnect = isWalletConnectModule(selected);
      if (walletConnect) {
        setPairing(true);
        setPairingUri(await getPairingUri());
      }
      const { address: connectedAddress } = await StellarWalletsKit.getAddress();
      setAddress(connectedAddress);
      setAccounts(await enumerateAccounts(connectedAddress));
      storeSelectedWalletId(selected.productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setPairing(false);
      setPairingUri(null);
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
    setPairing(false);
    setPairingUri(null);
  }, []);

  const switchAccount = useCallback((account: string) => {
    setAccounts((current) => (current.includes(account) ? current : [...current, account]));
    setAddress(account);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        accounts,
        connecting,
        error,
        pairing,
        pairingUri,
        connect,
        disconnect,
        switchAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
