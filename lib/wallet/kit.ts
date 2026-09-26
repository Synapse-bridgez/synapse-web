import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { getStoredWalletId } from "./storage";

export { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

let initialized = false;

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules: [new FreighterModule(), new xBullModule()],
  });

  initialized = true;
}

/**
 * Idle-session timeout configuration for wallet connections.
 *
 * A wallet left connected indefinitely on a shared or unattended machine is a
 * security exposure, so the session is auto-disconnected after a period of
 * user inactivity. The timeout is configurable and defaults to 15 minutes.
 */
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** How long before expiry the "stay connected" warning is shown. */
export const DEFAULT_IDLE_WARNING_MS = 60 * 1000;

/** User interaction events that count as activity and reset the idle timer. */
export const IDLE_ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

export type IdleActivityEvent = (typeof IDLE_ACTIVITY_EVENTS)[number];

export interface IdleTimeoutOptions {
  /** Total inactivity before auto-disconnect, in ms. Defaults to 15 minutes. */
  timeoutMs?: number;
  /** Lead time before expiry at which the warning fires, in ms. */
  warningMs?: number;
  /** Called once when the warning window is entered. */
  onWarning?: () => void;
  /** Called once when the idle timeout expires. */
  onTimeout?: () => void;
}

export interface IdleTimeoutController {
  /** Reset the idle timer (e.g. when the user chooses to stay connected). */
  reset: () => void;
  /** Pause the timer while a transaction is being signed/confirmed. */
  pause: () => void;
  /** Resume the timer after signing completes. */
  resume: () => void;
  /** Tear down listeners and timers. */
  dispose: () => void;
}

/**
 * Tracks user interaction and invokes `onTimeout` after a period of
 * inactivity, with an `onWarning` callback fired before expiry so the UI can
 * offer a "stay connected" option. The timer is paused while a transaction is
 * in flight so signing/confirmation is never interrupted.
 */
export function createIdleTimeout(
  options: IdleTimeoutOptions = {},
): IdleTimeoutController {
  const timeoutMs = options.timeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const warningMs = Math.min(
    options.warningMs ?? DEFAULT_IDLE_WARNING_MS,
    timeoutMs,
  );

  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let paused = false;
  let disposed = false;

  const clearTimers = () => {
    if (warningTimer !== null) {
      clearTimeout(warningTimer);
      warningTimer = null;
    }
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  const schedule = () => {
    clearTimers();
    if (disposed || paused) return;

    warningTimer = setTimeout(() => {
      warningTimer = null;
      if (!disposed && !paused) options.onWarning?.();
    }, Math.max(timeoutMs - warningMs, 0));

    timeoutTimer = setTimeout(() => {
      timeoutTimer = null;
      if (!disposed && !paused) options.onTimeout?.();
    }, timeoutMs);
  };

  const reset = () => {
    if (disposed) return;
    schedule();
  };

  const pause = () => {
    paused = true;
    clearTimers();
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    schedule();
  };

  const dispose = () => {
    disposed = true;
    clearTimers();
    if (typeof window !== "undefined") {
      for (const event of IDLE_ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset);
      }
    }
  };

  if (typeof window !== "undefined") {
    for (const event of IDLE_ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }
  }

  schedule();

  return { reset, pause, resume, dispose };
}

export { StellarWalletsKit };
