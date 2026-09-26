"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createSorobanEventPoller,
  type NormalizedSorobanEvent,
  type RpcHealth,
  type SorobanEventPoller,
} from "./events";

export type NetworkStatus = "match" | "mismatch" | "unknown";

export interface RpcEndpointState {
  url: string;
  healthy: boolean;
  latencyMs: number | null;
  failures: number;
  lastCheck: number;
  cooldownUntil: number;
}

interface SorobanContextValue {
  events: NormalizedSorobanEvent[];
  health: RpcHealth;
  poller: SorobanEventPoller | null;
  networkStatus: NetworkStatus;
  configuredPassphrase: string | null;
  walletPassphrase: string | null;
  checkNetwork: (walletPassphrase?: string | null) => NetworkStatus;
  endpoints: RpcEndpointState[];
  activeRpcUrl: string | null;
}

const SorobanContext = createContext<SorobanContextValue>({
  events: [],
  health: { connected: false, lastCheck: 0, lastEventTimestamp: null, error: null },
  poller: null,
  networkStatus: "unknown",
  configuredPassphrase: null,
  walletPassphrase: null,
  checkNetwork: () => "unknown",
  endpoints: [],
  activeRpcUrl: null,
});

export function useSoroban() {
  return useContext(SorobanContext);
}

interface SorobanProviderProps {
  children: ReactNode;
  rpcUrl?: string;
  rpcUrls?: string[];
  contractId?: string;
  networkPassphrase?: string;
}

const HEALTH_CHECK_INTERVAL_MS = 15_000;
const HEALTH_CHECK_TIMEOUT_MS = 4_000;
const FAILURE_THRESHOLD = 2;
const COOLDOWN_MS = 30_000;

function parseConfiguredEndpoints(explicit?: string[]): string[] {
  if (explicit && explicit.length > 0) {
    return explicit.map((u) => u.trim()).filter(Boolean);
  }
  const raw =
    typeof process !== "undefined" && process.env
      ? process.env.NEXT_PUBLIC_SOROBAN_RPC_URLS ?? process.env.NEXT_PUBLIC_SOROBAN_RPC_URL
      : undefined;
  if (!raw) return [];
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

async function probeEndpoint(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return Date.now() - started;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function SorobanProvider({
  children,
  rpcUrl,
  rpcUrls,
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
  const [walletPassphrase, setWalletPassphrase] = useState<string | null>(null);

  const configuredEndpoints = useMemo(() => {
    const list = parseConfiguredEndpoints(rpcUrls);
    if (rpcUrl && !list.includes(rpcUrl)) return [rpcUrl, ...list];
    return list;
  }, [rpcUrl, rpcUrls]);

  const [endpoints, setEndpoints] = useState<RpcEndpointState[]>(() =>
    configuredEndpoints.map((url) => ({
      url,
      healthy: true,
      latencyMs: null,
      failures: 0,
      lastCheck: 0,
      cooldownUntil: 0,
    })),
  );

  const [activeRpcUrl, setActiveRpcUrl] = useState<string | null>(
    configuredEndpoints[0] ?? null,
  );

  const [poller, setPoller] = useState<SorobanEventPoller | null>(null);
  const endpointsRef = useRef(endpoints);
  endpointsRef.current = endpoints;

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

  // Periodic client-side health checks with circuit-breaker + hysteresis.
  useEffect(() => {
    if (configuredEndpoints.length === 0) return;
    let cancelled = false;

    const runChecks = async () => {
      const now = Date.now();
      const results = await Promise.all(
        configuredEndpoints.map(async (url) => ({ url, latency: await probeEndpoint(url) })),
      );
      if (cancelled) return;

      setEndpoints((prev) => {
        const next = prev.map((ep) => {
          const result = results.find((r) => r.url === ep.url);
          if (!result) return ep;
          const ok = result.latency !== null;
          if (ok) {
            return {
              ...ep,
              healthy: true,
              latencyMs: result.latency,
              failures: 0,
              lastCheck: now,
              cooldownUntil: 0,
            };
          }
          const failures = ep.failures + 1;
          const tripped = failures >= FAILURE_THRESHOLD;
          return {
            ...ep,
            healthy: tripped ? false : ep.healthy,
            failures,
            lastCheck: now,
            cooldownUntil: tripped ? now + COOLDOWN_MS : ep.cooldownUntil,
          };
        });
        return next;
      });
    };

    runChecks();
    const interval = setInterval(runChecks, HEALTH_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [configuredEndpoints]);

  // Latency-aware selection among healthy endpoints, with failover/failback.
  useEffect(() => {
    const now = Date.now();
    const healthy = endpoints.filter(
      (ep) => ep.healthy && ep.cooldownUntil <= now,
    );
    if (healthy.length === 0) return;

    const current = endpoints.find((ep) => ep.url === activeRpcUrl);
    const currentHealthy = current && current.healthy && current.cooldownUntil <= now;

    // Failback: prefer the highest-priority (earliest) healthy endpoint when it recovers.
    const preferred = healthy[0];
    if (!currentHealthy) {
      setActiveRpcUrl(preferred.url);
      return;
    }
    // Among healthy endpoints, pick the lowest latency but keep priority order as tiebreak.
    const best = healthy.reduce((acc, ep) => {
      const accLatency = acc.latencyMs ?? Number.POSITIVE_INFINITY;
      const epLatency = ep.latencyMs ?? Number.POSITIVE_INFINITY;
      return epLatency < accLatency ? ep : acc;
    }, healthy[0]);
    if (best.url !== activeRpcUrl && preferred.url === best.url) {
      setActiveRpcUrl(best.url);
    }
  }, [endpoints, activeRpcUrl]);

  // Recreate the poller whenever the active endpoint changes.
  useEffect(() => {
    if (!activeRpcUrl) return;
    const next = createSorobanEventPoller(activeRpcUrl, contractId);
    setPoller(next);
    return () => {
      next.stop();
    };
  }, [activeRpcUrl, contractId]);

  useEffect(() => {
    if (!poller) return;
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
        endpoints,
        activeRpcUrl,
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

export function useSorobanEndpoints() {
  const { endpoints, activeRpcUrl } = useSoroban();
  return { endpoints, activeRpcUrl };
}
