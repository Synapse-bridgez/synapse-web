import { NextResponse } from "next/server";

import { getHealth } from "@/lib/soroban/rpcHealth";

/**
 * Synthetic health endpoint for the deployed dashboard.
 *
 * The external monitor polls this on a schedule. Two things are checked
 * separately, because they need different responses:
 *
 * - **app** — this route and the deployment answering at all.
 * - **rpc** — a real `getHealth` call to the configured Soroban endpoint, so an
 *   RPC provider outage is detected here rather than being reported as the
 *   dashboard being down.
 *
 * The two are reported independently in the body (`app.reachable` vs
 * `rpc.reachable`), and a failed or timed-out RPC probe returns 503 with
 * `status: "degraded"` so status-code-based monitors alert on it.
 *
 * Never cached: a cached 200 would hide exactly the outage this exists to catch.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // If this line runs at all, the deployment is serving.
  const rpc = await getHealth();

  const body = {
    status: rpc.reachable ? "ok" : "degraded",
    app: { reachable: true },
    rpc,
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: rpc.reachable ? 200 : 503,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}
