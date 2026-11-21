import { StellarWalletsKit } from "./kit";

export type SigningRequestStatus =
  "pending" | "signing" | "signed" | "cancelled" | "stale" | "failed";

export type SigningErrorCategory =
  "user_rejected" | "wallet_not_connected" | "transport" | "stale" | "unknown";

export interface SigningRequest<T = string> {
  id: string;
  label: string;
  /** Builds the XDR to sign. May throw if the underlying tx is stale/invalid. */
  build: () => Promise<string> | string;
  /** Optional staleness check run right before signing. */
  isStale?: () => boolean;
  status: SigningRequestStatus;
  result?: T;
  error?: string;
  /** Classification of the failure, when the request failed. */
  errorCategory?: SigningErrorCategory;
}

export interface SigningQueueState {
  items: SigningRequest[];
  activeId: string | null;
  total: number;
  completed: number;
  cancelled: boolean;
}

type Listener = (state: SigningQueueState) => void;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `sign-${Date.now()}-${counter}`;
}

/**
 * Error thrown when a signing request fails. Preserves the original error as
 * `cause` and exposes a `category` so callers can distinguish user rejection
 * from a disconnected wallet or a transport failure.
 */
export class SigningError extends Error {
  readonly category: SigningErrorCategory;
  readonly cause?: unknown;

  constructor(category: SigningErrorCategory, message: string, cause?: unknown) {
    super(message);
    this.name = "SigningError";
    this.category = category;
    this.cause = cause;
  }
}

const USER_REJECTED_RE =
  /user (rejected|denied|cancell?ed)|rejected by (the )?user|request (was )?(rejected|denied)|declined by user|user cancel/i;
const NOT_CONNECTED_RE =
  /not connected|no (wallet|account) (connected|selected)|wallet (is )?not (connected|available)|disconnected|no active (wallet|account)|wallet not found/i;
const TRANSPORT_RE =
  /network|fetch|timeout|timed out|transport|connection (error|refused|reset)|failed to fetch|socket|offline|econn|5\d\d|gateway/i;
const STALE_RE = /stale|expired|not found|invalid|tx_bad|timebound/i;

function classifySigningError(message: string): SigningErrorCategory {
  if (USER_REJECTED_RE.test(message)) return "user_rejected";
  if (NOT_CONNECTED_RE.test(message)) return "wallet_not_connected";
  if (TRANSPORT_RE.test(message)) return "transport";
  if (STALE_RE.test(message)) return "stale";
  return "unknown";
}

const CATEGORY_PREFIX: Record<SigningErrorCategory, string> = {
  user_rejected: "Signature request was rejected by the user",
  wallet_not_connected: "Wallet is not connected",
  transport: "Could not reach the wallet/network",
  stale: "Transaction is no longer valid and was skipped",
  unknown: "Signing failed",
};

/**
 * App-wide FIFO queue that serializes every wallet-signature request so that
 * concurrent extension popups never collide. Strict FIFO for this issue.
 */
class SigningQueue {
  private items: SigningRequest[] = [];
  private activeId: string | null = null;
  private running = false;
  private cancelled = false;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SigningQueueState {
    const completed = this.items.filter(
      (i) =>
        i.status === "signed" ||
        i.status === "stale" ||
        i.status === "failed" ||
        i.status === "cancelled"
    ).length;
    return {
      items: this.items.map((i) => ({ ...i })),
      activeId: this.activeId,
      total: this.items.length,
      completed,
      cancelled: this.cancelled,
    };
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  /**
   * Enqueue a signing request. Returns a promise that resolves with the signed
   * XDR, or rejects if the item was cancelled, stale, or failed.
   */
  enqueue<T = string>(request: Omit<SigningRequest<T>, "id" | "status">): Promise<T> {
    const item = {
      ...request,
      id: nextId(),
      status: "pending",
    } as unknown as SigningRequest;
    this.items.push(item);
    this.emit();

    return new Promise<T>((resolve, reject) => {
      (
        item as SigningRequest & { _resolve?: (v: T) => void; _reject?: (e: Error) => void }
      )._resolve = resolve;
      (
        item as SigningRequest & { _resolve?: (v: T) => void; _reject?: (e: Error) => void }
      )._reject = reject;
      void this.drain();
    });
  }

  /** Cancel all remaining queued (not yet signing) items. */
  cancelRemaining(): void {
    this.cancelled = true;
    for (const item of this.items) {
      if (item.status === "pending") {
        item.status = "cancelled";
        item.error = "Cancelled by user";
        item.errorCategory = "user_rejected";
        this.settle(
          item,
          new SigningError("user_rejected", "Signing request cancelled")
        );
      }
    }
    this.emit();
  }

  private settle(item: SigningRequest, error?: Error): void {
    const withHandlers = item as SigningRequest & {
      _resolve?: (v: unknown) => void;
      _reject?: (e: Error) => void;
    };
    if (error) {
      withHandlers._reject?.(error);
    } else {
      withHandlers._resolve?.(item.result);
    }
    withHandlers._resolve = undefined;
    withHandlers._reject = undefined;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (;;) {
        const next = this.items.find((i) => i.status === "pending");
        if (!next) break;

        this.activeId = next.id;
        next.status = "signing";
        this.emit();

        try {
          if (next.isStale?.()) {
            next.status = "stale";
            next.error = "Transaction is no longer valid and was skipped";
            next.errorCategory = "stale";
            this.settle(
              next,
              new SigningError("stale", next.error)
            );
            this.emit();
            continue;
          }

          const xdr = await next.build();
          const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
            networkPassphrase: undefined,
          });
          next.status = "signed";
          next.result = signedTxXdr as unknown as string;
          this.settle(next);
        } catch (err) {
          const originalMessage = err instanceof Error ? err.message : String(err);
          const category = classifySigningError(originalMessage);
          const stale = category === "stale";
          next.status = stale ? "stale" : "failed";
          next.errorCategory = category;
          // Preserve the original message; only prepend category context.
          next.error = `${CATEGORY_PREFIX[category]}: ${originalMessage}`;
          this.settle(
            next,
            new SigningError(category, next.error, err)
          );
        }
        this.emit();
      }
    } finally {
      this.activeId = null;
      this.running = false;
      this.emit();
    }
  }
}

export const signingQueue = new SigningQueue();
