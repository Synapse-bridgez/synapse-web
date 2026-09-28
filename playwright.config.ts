import { defineConfig, devices } from "@playwright/test";

/**
 * Staging smoke tests.
 *
 * These run against a URL that is already deployed -- there is deliberately no
 * `webServer` here. A smoke test that builds and starts its own copy cannot
 * catch the failure modes that matter most (a bad deploy, a missing asset, a
 * runtime-only crash in a production bundle), which is the entire point of it.
 *
 * The target URL comes from SMOKE_BASE_URL, a repository secret, and is
 * required. There is no default: a smoke test pointed at localhost by accident
 * is worse than no smoke test, because it passes.
 */
const baseURL = process.env.SMOKE_BASE_URL;

if (!baseURL) {
  // Fail in the config, before any browser starts, with a message that says how
  // to fix it rather than an opaque Playwright "invalid URL" error later.
  throw new Error(
    "SMOKE_BASE_URL is not set. Staging smoke tests must run against a deployed URL.\n" +
      "Set it as a repository secret (Settings -> Secrets and variables -> Actions),\n" +
      'or pass it inline: SMOKE_BASE_URL="https://staging.example.com" npm run test:e2e'
  );
}

export default defineConfig({
  testDir: "./e2e",
  // Failures here mean staging is broken, so a failure that is merely slow to
  // arrive should be retried -- but a bounded number of times, so a genuinely
  // broken deploy fails the gate instead of burning the whole retry budget.
  retries: process.env.CI ? 2 : 0,
  // One worker against one shared staging deployment. More would have the tests
  // fighting each other for the same instance and turn a smoke signal into a
  // load test.
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    // The point of the gate is to notice a broken production bundle, so a
    // failed trace is the most useful artifact when it does.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The app's only route is a static dashboard, but a stray in-page navigation
    // to a dead URL should still fail rather than hang.
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
