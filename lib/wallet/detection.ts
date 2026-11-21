"use client";

import { useState, useEffect, useCallback } from "react";

export interface ExtensionCheckResult {
  freighter: boolean;
  xbull: boolean;
  albedo: boolean;
  hasAny: boolean;
}

type WalletWindow = Window & {
  freighterApi?: unknown;
  freighter?: unknown;
  xBull?: unknown;
  xbull?: unknown;
  xBullWallet?: unknown;
  albedo?: unknown;
  stellar?: { freighter?: unknown; xbull?: unknown };
};

const reportedProbeFailures = new Set<string>();

/**
 * Runs a single wallet probe. A provider whose injected property throws (e.g. a
 * throwing getter) counts as "not available" and is logged once, so it cannot
 * abort detection for the other wallets.
 */
function probeWallet(name: string, probe: () => unknown): boolean {
  try {
    return Boolean(probe());
  } catch (error) {
    if (!reportedProbeFailures.has(name)) {
      reportedProbeFailures.add(name);
      console.warn(`Wallet detection probe for ${name} threw; treating it as unavailable.`, error);
    }
    return false;
  }
}

/**
 * Checks if a specific wallet extension is injected into the global window object.
 */
export function checkInstalledExtensions(): ExtensionCheckResult {
  if (typeof window === "undefined") {
    return {
      freighter: false,
      xbull: false,
      albedo: false,
      hasAny: false,
    };
  }

  const win = window as WalletWindow;

  // Freighter detection
  const freighter = probeWallet(
    "freighter",
    () => win.freighterApi || win.freighter || (win.stellar && win.stellar.freighter)
  );

  // xBull detection
  const xbull = probeWallet(
    "xbull",
    () => win.xBull || win.xbull || win.xBullWallet || (win.stellar && win.stellar.xbull)
  );

  // Albedo detection
  const albedo = probeWallet("albedo", () => win.albedo);

  const hasAny = freighter || xbull || albedo;

  return {
    freighter,
    xbull,
    albedo,
    hasAny,
  };
}

/**
 * Hook to monitor wallet extension installation state, re-checking on tab focus and visibility change.
 */
export function useWalletExtensionDetection() {
  const [result, setResult] = useState<ExtensionCheckResult>({
    freighter: false,
    xbull: false,
    albedo: false,
    hasAny: false,
  });
  const [checked, setChecked] = useState(false);

  const recheck = useCallback(() => {
    const res = checkInstalledExtensions();
    setResult(res);
    setChecked(true);
    return res;
  }, []);

  useEffect(() => {
    recheck();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recheck();
      }
    };

    const handleFocus = () => {
      recheck();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [recheck]);

  return {
    ...result,
    checked,
    recheck,
  };
}
