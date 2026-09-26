"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createSorobanEventPoller,
  type NormalizedSorobanEvent,
  type RpcHealth,
  type SorobanEventPoller,
} from "./events";

interface SorobanContextValue {
  events: NormalizedSorobanEvent[];
  health: RpcHealth;
  poller: SorobanEventPoller | null;
}

const SorobanContext = createContext<SorobanContextValue>({
  events: [],
  health: { connected: false, lastCheck: 0, lastEventTimestamp: null, error: null },
  poller: null,
});

export function useSoroban() {
  return useContext(SorobanContext);
}

interface SorobanProviderProps {
  children: ReactNode;
  rpcUrl?: string;
  contractId?: string;
}

/**
 * Soroban/contract state is held in a single store object so that the
 * cross-cutting state layer can be migrated incrementally behind the
 * existing hook APIs (`useSoroban`, `useSorobanEvents`, `useSorobanHealth`)
 * without changing any consuming component.
 */
interface SorobanStore {
  events: NormalizedSorobanEvent[];
  health: RpcHealth;
  poller: SorobanEventPoller | null;
}

const initialHealth: RpcHealth = {
  connected: false,
  lastCheck: 0,
  lastEventTimestamp: null,
  error: null,
};

const initialStore: SorobanStore = {
  events: [],
  health: initialHealth,
  poller: null,
};

export function SorobanProvider({ children, rpcUrl, contractId }: SorobanProviderProps) {
  const [store, setStore] = useState<SorobanStore>(() => ({
    ...initialStore,
    poller: createSorobanEventPoller(rpcUrl, contractId),
  }));

  useEffect(() => {
    const poller = store.poller;
    if (!poller) return;

    const unsubHealth = poller.onHealth((health) => {
      setStore((prev) => ({ ...prev, health }));
    });
    const unsubEvents = poller.onEvents((newEvents) => {
      setStore((prev) => {
        const combined = [...newEvents, ...prev.events];
        return { ...prev, events: combined.slice(0, 200) };
      });
    });

    poller.start();

    return () => {
      poller.stop();
      unsubHealth();
      unsubEvents();
    };
  }, [store.poller]);

  return (
    <SorobanContext.Provider value={store}>{children}</SorobanContext.Provider>
  );
}

export function useSorobanEvents() {
  return useSoroban().events;
}

export function useSorobanHealth() {
  return useSoroban().health;
}
