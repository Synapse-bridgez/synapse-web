"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createSorobanEventPoller,
  type NormalizedSorobanEvent,
  type RpcHealth,
  type SorobanEventPoller,
} from "./events";

export type NetworkStatus = "match" | "mismatch" | "unknown";

interface SorobanContextValue {
  events: NormalizedSorobanEvent[];
  health: RpcHealth;
  poller: SorobanEventPoller | null;
  networkStatus: NetworkStatus;
  configuredPassphrase: string | null;
  walletPassphrase: string | null;
  checkNetwork: (walletPassphrase?: string | null) => NetworkStatus;
}

const SorobanContext = createContext<SorobanContextValue>({
  events: [],
  health: { connected: false, lastCheck: 0, lastEventTimestamp: null, error: null },
  poller: null,
  networkStatus: "unknown",
  configuredPassphrase: null,
  walletPassphrase: null,
  checkNetwork: () => "unknown",
});

export function useSoroban() {
  return useContext(SorobanContext);
}

interface SorobanProviderProps {
  children: ReactNode;
  rpcUrl?: string;
  contractId?: string;
  networkPassphrase?: string;
}

export function SorobanProvider({
  children,
  rpcUrl,
  contractId,
  networkPassphrase,
}: SorobanProviderProps) {
  const [events, setEvents] = useState<NormalizedSorobanEvent[]>([]);
  const [health, setHealth] = useState<RpcHealth>({
    connected: false,
    lastCheck: 0,
    lastEventTimestamp: null,
    error: null,
  });
  const [poller] = useState<SorobanEventPoller>(() => createSorobanEventPoller(rpcUrl, contractId));
  const [walletPassphrase, setWalletPassphrase] = useState<string | null>(null);

  const configuredPassphrase = useMemo(() => {
    if (networkPassphrase) return networkPassphrase;
    if (typeof process !== "undefined" && process.env) {
      return process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? null;
    }
    return null;
  }, [networkPassphrase]);

  const checkNetwork = useMemo(() => {
    return (reported?: string | null): NetworkStatus => {
      const wallet = reported ?? walletPassphrase;
      if (reported !== undefined) setWalletPassphrase(reported ?? null);
      if (!wallet || !configuredPassphrase) return "unknown";
      return wallet === configuredPassphrase ? "match" : "mismatch";
    };
  }, [walletPassphrase, configuredPassphrase]);

  const networkStatus = useMemo<NetworkStatus>(() => {
    if (!walletPassphrase || !configuredPassphrase) return "unknown";
    return walletPassphrase === configuredPassphrase ? "match" : "mismatch";
  }, [walletPassphrase, configuredPassphrase]);

  useEffect(() => {
    const unsubHealth = poller.onHealth(setHealth);
    const unsubEvents = poller.onEvents((newEvents) => {
      setEvents((prev) => {
        const combined = [...newEvents, ...prev];
        return combined.slice(0, 200);
      });
    });

    poller.start();

    return () => {
      poller.stop();
      unsubHealth();
      unsubEvents();
    };
  }, [poller]);

  return (
    <SorobanContext.Provider
      value={{
        events,
        health,
        poller,
        networkStatus,
        configuredPassphrase,
        walletPassphrase,
        checkNetwork,
      }}
    >
      {children}
    </SorobanContext.Provider>
  );
}

export function useSorobanEvents() {
  return useSoroban().events;
}

export function useSorobanHealth() {
  return useSoroban().health;
}

export function useNetworkStatus() {
  const { networkStatus, configuredPassphrase, walletPassphrase, checkNetwork } = useSoroban();
  return { networkStatus, configuredPassphrase, walletPassphrase, checkNetwork };
}
