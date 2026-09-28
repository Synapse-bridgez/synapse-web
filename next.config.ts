import type { NextConfig } from "next";

import { securityHeaders } from "./lib/security/csp";

/**
 * Security headers are applied to every route from one place rather than per
 * layout, so a new route cannot ship without them.
 *
 * `lib/security/csp.ts` owns the policy and the reasoning behind each
 * directive; this file only wires the environment into it.
 *
 * Note that `process.env.NODE_ENV` is inlined by Next at build time, and every
 * `NEXT_PUBLIC_*` value is inlined into the client bundle. The RPC origin in
 * the policy is therefore a build-time decision: changing
 * `NEXT_PUBLIC_SOROBAN_RPC_URL` requires a redeploy for the header to change
 * with it.
 */
const nextConfig: NextConfig = {
  async headers() {
    const headers = securityHeaders({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
      NEXT_PUBLIC_CSP_CONNECT_SRC: process.env.NEXT_PUBLIC_CSP_CONNECT_SRC,
      NEXT_PUBLIC_CSP_ALLOW_ANY_HTTPS: process.env.NEXT_PUBLIC_CSP_ALLOW_ANY_HTTPS,
    });

    return [
      {
        // Covers every page and every asset, including routes added later.
        source: "/:path*",
        headers: headers.map(({ key, value }) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
