/**
 * Lightweight telemetry facade.
 *
 * Telemetry must never break the app: every entry point is fire-and-forget and
 * swallows its own failures. Transport rejections are counted and surfaced once
 * (console warning in dev, a single Sentry breadcrumb in prod) so a misconfigured
 * endpoint is noticeable without per-event spam.
 */

const SENSITIVE_KEY_PATTERNS = [
  "privatekey",
  "secret",
  "signedxdr",
  "password",
  "auth",
  "token",
  "mnemonic",
];

const MAX_SCRUB_DEPTH = 5;

/** Number of transport failures observed since the last reset. */
export let transportFailureCount = 0;

/** Failures required before the one-shot warning is surfaced. */
export const TRANSPORT_FAILURE_THRESHOLD = 3;

let transportWarningEmitted = false;

export type TelemetryProvider = (
  error: unknown,
  context: Record<string, unknown>,
) => void | Promise<void>;

let provider: TelemetryProvider | null = null;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Recursively strips sensitive keys from a telemetry context object.
 * Returns a new object; the input is never mutated.
 */
export function scrubContext(
  context: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth >= MAX_SCRUB_DEPTH) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = scrubContext(value as Record<string, unknown>, depth + 1);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Whether telemetry reporting is enabled for the current environment. */
export function isTelemetryEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  return process.env.NEXT_PUBLIC_TELEMETRY_DISABLED !== "true";
}

/** Registers (or clears, with `null`) the telemetry transport. */
export function setTelemetryProvider(next: TelemetryProvider | null): void {
  provider = next;
}

/** Resets the transport failure counter and one-shot warning state. */
export function resetTransportFailures(): void {
  transportFailureCount = 0;
  transportWarningEmitted = false;
}

function surfaceTransportFailure(error: unknown): void {
  transportFailureCount += 1;
  if (transportWarningEmitted) return;
  if (transportFailureCount < TRANSPORT_FAILURE_THRESHOLD) return;

  transportWarningEmitted = true;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[telemetry] transport failed ${transportFailureCount} times; dropping events`,
      error,
    );
    return;
  }

  // Production: emit a single Sentry breadcrumb rather than a full event.
  try {
    const sentry = (
      globalThis as {
        Sentry?: { addBreadcrumb?: (b: Record<string, unknown>) => void };
      }
    ).Sentry;
    sentry?.addBreadcrumb?.({
      category: "telemetry",
      level: "warning",
      message: `telemetry transport failed ${transportFailureCount} times`,
    });
  } catch {
    // Never let telemetry reporting throw.
  }
}

/**
 * Reports an error to the registered transport. Fire-and-forget: never throws,
 * even if the transport rejects or throws synchronously.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (!isTelemetryEnabled()) return;

  const scrubbed = scrubContext(context);

  if (!provider) {
    console.error("[telemetry] unhandled error", error, scrubbed);
    return;
  }

  try {
    const result = provider(error, scrubbed);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(surfaceTransportFailure);
    }
  } catch (err) {
    surfaceTransportFailure(err);
  }
}
