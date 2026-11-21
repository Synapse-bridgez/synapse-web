export type RpcHealthStatus = "ok" | "degraded" | "unhealthy";

export interface RpcHealthResult {
  status: RpcHealthStatus;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
}

export interface RpcHealthProbeOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 5000;

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown RPC probe error";
  }
}

/**
 * Probe the Soroban RPC endpoint and report an explicit health status.
 *
 * A thrown error or timeout must never resolve to `ok`; it produces an
 * `unhealthy` (or `degraded` for timeouts) status carrying the error message.
 */
export async function probeRpcHealth(
  rpcUrl: string,
  options: RpcHealthProbeOptions = {},
): Promise<RpcHealthResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = options;
  const checkedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
        params: {},
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        status: "unhealthy",
        latencyMs,
        checkedAt,
        error: `RPC responded with HTTP ${response.status}`,
      };
    }

    return { status: "ok", latencyMs, checkedAt };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const aborted = controller.signal.aborted;
    return {
      status: aborted ? "degraded" : "unhealthy",
      latencyMs,
      checkedAt,
      error: aborted
        ? `RPC probe timed out after ${timeoutMs}ms`
        : toErrorMessage(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
