import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Retry budget for the test suite.
 *
 * A flaky test that fails once in forty runs should not break unrelated work,
 * so each test is attempted up to three times. A test that is still red after
 * the last attempt fails the build exactly as it did before this existed.
 *
 * Vitest 3 has no delay between retries — they happen immediately — which suits
 * this repo. Every existing test is a fast in-process unit test, and there is
 * no shared external state for a retry to wait on. If a test ever needs to wait
 * for a race to resolve, it needs a real clock injected instead, which is a fix
 * rather than something a sleep should paper over.
 *
 * What retries deliberately do NOT do is decide anything. Every test that was
 * retried is recorded by the flake reporter below and folded into
 * docs/testing/flake-history.json by `npm run test:flake-history`, which is
 * where a test that keeps needing retries is escalated instead of ignored.
 *
 * Override locally with FLAKE_RETRY=0 to see the suite's real first-attempt
 * pass rate.
 */
const retry = Number(process.env.FLAKE_RETRY ?? 2);
if (!Number.isInteger(retry) || retry < 0) {
  throw new Error(
    `FLAKE_RETRY must be a non-negative integer, got ${JSON.stringify(process.env.FLAKE_RETRY)}`
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    retry,
    reporters: ["default", "./scripts/test/flake-reporter.mjs"],
  },
});
