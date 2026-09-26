import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { WalletConnectModule } from "@creit.tech/stellar-wallets-kit/modules/wallet-connect";
import { getStoredWalletId } from "./storage";

export { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

let initialized = false;

/**
 * WalletConnect requires a project id issued by the WalletConnect Cloud.
 * It is read from the public env var so the same build can target different
 * relay projects without code changes.
 */
const WALLETCONNECT_PROJECT_ID =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) || "";

export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;

  const modules = [new FreighterModule(), new xBullModule()];

  // Only register WalletConnect when a project id is configured; otherwise
  // the module would fail to open a relay session and break the connect flow.
  if (WALLETCONNECT_PROJECT_ID) {
    modules.push(
      new WalletConnectModule({
        projectId: WALLETCONNECT_PROJECT_ID,
        name: "Stellar Dashboard",
        description: "Connect a mobile Stellar wallet via WalletConnect",
        url: typeof window !== "undefined" ? window.location.origin : "",
        icons: [],
      }),
    );
  }

  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: getStoredWalletId(),
    modules,
  });

  initialized = true;
}

/**
 * Enumerate the accounts the currently connected extension exposes.
 *
 * Not every wallet supports multi-account enumeration. When the underlying
 * module does not implement `getAccounts` (or throws), we return an empty
 * list so consumers can hide the account switcher entirely instead of
 * rendering a broken empty state.
 */
export async function getWalletAccounts(): Promise<string[]> {
  ensureWalletKitInitialized();

  const kit = StellarWalletsKit as unknown as {
    getAccounts?: () => Promise<{ address: string }[]>;
  };

  if (typeof kit.getAccounts !== "function") {
    return [];
  }

  try {
    const accounts = await kit.getAccounts();
    if (!Array.isArray(accounts)) return [];
    return accounts
      .map((account) => account?.address)
      .filter((address): address is string => typeof address === "string" && address.length > 0);
  } catch {
    return [];
  }
}

/**
 * The distinct ways a wallet connection attempt can fail. Each maps to a
 * dedicated, actionable recovery message in the connection-error UI.
 */
export type WalletConnectionErrorKind =
  | "not-installed"
  | "locked"
  | "rejected"
  | "wrong-network"
  | "unknown";

export interface WalletConnectionError {
  kind: WalletConnectionErrorKind;
  /** Human-readable, actionable guidance for the user. */
  message: string;
  /** Install page for the specific wallet, only set for "not-installed". */
  installUrl?: string;
}

/**
 * Install pages for the wallets we support. Used to give the "not installed"
 * state a direct, wallet-specific link instead of a generic message.
 */
export const WALLET_INSTALL_URLS: Record<string, string> = {
  freighter: "https://www.freighter.app/",
  xbull: "https://xbull.app/",
};

/**
 * Normalize an unknown thrown value into a lowercase string we can pattern
 * match against. Wallet extensions throw strings, Errors, and plain objects
 * with differing shapes, so we defensively flatten all of them.
 */
function toErrorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error.toLowerCase();
  if (error instanceof Error) return `${error.name} ${error.message}`.toLowerCase();
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.error, record.reason, record.code, record.name]
      .filter((part): part is string => typeof part === "string")
      .join(" ");
    if (parts) return parts.toLowerCase();
    try {
      return JSON.stringify(error).toLowerCase();
    } catch {
      return "";
    }
  }
  return String(error).toLowerCase();
}

/**
 * Classify a raw kit/extension error into a typed recovery state.
 *
 * Freighter and xBull surface failures with different shapes and wording, so
 * we match on a broad set of substrings rather than a single canonical error.
 * Order matters: "not installed" is checked before "locked" because some
 * wallets report a missing extension as a locked/unavailable provider.
 */
export function classifyWalletConnectionError(
  error: unknown,
  walletId?: string,
): WalletConnectionError {
  const text = toErrorText(error);
  const normalizedWalletId = (walletId ?? getStoredWalletId() ?? "").toLowerCase();
  const installUrl = WALLET_INSTALL_URLS[normalizedWalletId];

  const notInstalledPatterns = [
    "not installed",
    "not detected",
    "not available",
    "not found",
    "no provider",
    "is not connected",
    "extension not",
    "install the",
    "please install",
    "freighter is not",
    "xbull is not",
  ];
  if (notInstalledPatterns.some((pattern) => text.includes(pattern))) {
    return {
      kind: "not-installed",
      message: installUrl
        ? "This wallet extension isn't installed. Install it, then reload the page and try again."
        : "This wallet extension isn't installed. Install it, then reload the page and try again.",
      installUrl,
    };
  }

  const lockedPatterns = [
    "locked",
    "unlock",
    "password",
    "enter your password",
    "wallet is locked",
  ];
  if (lockedPatterns.some((pattern) => text.includes(pattern))) {
    return {
      kind: "locked",
      message: "Your wallet is locked. Open the extension, unlock it, then try connecting again.",
    };
  }

  const rejectedPatterns = [
    "reject",
    "denied",
    "declined",
    "cancel",
    "user closed",
    "user dismissed",
    "request was rejected",
  ];
  if (rejectedPatterns.some((pattern) => text.includes(pattern))) {
    return {
      kind: "rejected",
      message: "You declined the connection request. Approve it in your wallet to continue.",
    };
  }

  const wrongNetworkPatterns = [
    "wrong network",
    "network mismatch",
    "unsupported network",
    "incorrect network",
    "switch network",
    "network passphrase",
  ];
  if (wrongNetworkPatterns.some((pattern) => text.includes(pattern))) {
    return {
      kind: "wrong-network",
      message: "Your wallet is on the wrong network. Switch it to Testnet, then try again.",
    };
  }

  return {
    kind: "unknown",
    message:
      "We couldn't connect to your wallet. Make sure the extension is installed and unlocked, then try again.",
  };
}

export { StellarWalletsKit };
