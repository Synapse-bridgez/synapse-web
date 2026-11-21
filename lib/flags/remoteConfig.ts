import { FLAG_KEYS, type FlagKey } from "./definitions";
import type { FlagOverride } from "./types";

/**
 * Remote flag loading.
 *
 * The contract that matters: this module never rejects and never throws away a
 * payload it already has. A broken config endpoint should degrade to the last
 * known-good flags, not to nothing — but it must also be honest about the fact
 * that those flags are stale, so the UI can warn instead of pretending the
 * rollout is live.
 */

export interface LoadFlagsOptions {
  readonly url?: string;
  readonly storage?: Storage | null;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly knownKeys?: readonly FlagKey[];
}

export interface LoadFlagsResult {
  readonly overrides: Record<string, FlagOverride>;
  readonly source: "remote" | "cache" | "empty";
  /** True when the last fetch failed and the payload is from an earlier load. */
  readonly stale: boolean;
  /** Epoch ms of the last successful fetch, if any. */
  readonly lastSuccessAt?: number;
  /** Message from the most recent failed fetch, if any. */
  readonly error?: string;
}

const CACHE_KEY = "synapse:flags:cache:v1";
const DEFAULT_TIMEOUT_MS = 5000;

interface CacheEnvelope {
  readonly overrides: Record<string, FlagOverride>;
  readonly fetchedAt: number;
}

// Module-level bookkeeping so a failure after a successful load is observable
// even when the caller does not hold onto the previous result.
let lastSuccessAt: number | undefined;
let lastError: string | undefined;

/** Reset the module-level stale tracking. Intended for tests. */
export function resetRemoteConfigState(): void {
  lastSuccessAt = undefined;
  lastError = undefined;
}

function readCache(storage: Storage | null | undefined): CacheEnvelope | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed || typeof parsed !== "object" || !parsed.overrides) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(storage: Storage | null | undefined, envelope: CacheEnvelope): void {
  if (!storage) return;
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage full or blocked. The in-memory payload still serves this session.
  }
}

function sanitise(
  payload: unknown,
  knownKeys: readonly FlagKey[] | undefined
): Record<string, FlagOverride> {
  if (!payload || typeof payload !== "object") return {};
  const allowed = knownKeys ? new Set<string>(knownKeys) : null;
  const out: Record<string, FlagOverride> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (allowed && !allowed.has(key)) continue;
    if (typeof value === "boolean") {
      out[key] = { value };
    } else if (value && typeof value === "object") {
      const candidate = value as { value?: unknown; rollout?: unknown };
      if (typeof candidate.value === "boolean") {
        out[key] = {
          value: candidate.value,
          rollout: typeof candidate.rollout === "number" ? candidate.rollout : undefined,
        };
      }
    }
  }
  return out;
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load flags from the remote endpoint, falling back to the cache.
 *
 * Never rejects. On failure the cached payload is returned with `stale: true`
 * and the error message attached; the cache is deliberately not cleared.
 */
export async function loadFlags(options: LoadFlagsOptions = {}): Promise<LoadFlagsResult> {
  const { url, storage, fetchImpl, timeoutMs = DEFAULT_TIMEOUT_MS, knownKeys } = options;
  const cached = readCache(storage);

  if (!url) {
    return {
      overrides: cached?.overrides ?? {},
      source: cached ? "cache" : "empty",
      stale: false,
      lastSuccessAt,
    };
  }

  const doFetch = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!doFetch) {
    lastError = "fetch is not available";
    return {
      overrides: cached?.overrides ?? {},
      source: cached ? "cache" : "empty",
      stale: cached !== null,
      lastSuccessAt,
      error: lastError,
    };
  }

  try {
    const response = await fetchWithTimeout(url, doFetch, timeoutMs);
    if (!response.ok) {
      throw new Error(`flag fetch failed: ${response.status}`);
    }
    const payload = await response.json();
    const overrides = sanitise(payload, knownKeys);
    const fetchedAt = Date.now();
    lastSuccessAt = fetchedAt;
    lastError = undefined;
    writeCache(storage, { overrides, fetchedAt });
    return { overrides, source: "remote", stale: false, lastSuccessAt };
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    // Keep serving the last known-good payload, but flag it as stale.
    return {
      overrides: cached?.overrides ?? {},
      source: cached ? "cache" : "empty",
      stale: cached !== null,
      lastSuccessAt,
      error: lastError,
    };
  }
}

/** Expose the module-level stale tracking for diagnostics. */
export function getRemoteConfigState(): { lastSuccessAt?: number; lastError?: string } {
  return { lastSuccessAt, lastError };
}

export { FLAG_KEYS };
