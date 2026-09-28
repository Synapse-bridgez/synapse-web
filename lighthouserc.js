// Lighthouse CI configuration (#155). Rationale and baseline: docs/ci/performance-gates.md
//
// Target selection:
//   LHCI_BASE_URL set  → audit that deployment (the PR preview URL, when the
//                        hosting platform reports one)
//   LHCI_BASE_URL unset → start the production build locally with `next start`
//
// Variance: every URL is audited LHCI_RUNS times (default 5), and assertions
// use the median run, so a single noisy run can't fail the build.

const baseUrl = (process.env.LHCI_BASE_URL || "").replace(/\/+$/, "");
const port = process.env.LHCI_PORT || "3000";
const origin = baseUrl || `http://localhost:${port}`;

// Key routes. The dashboard is one URL today (tabs are client state); add
// routes here as tabs become addressable.
const routes = (process.env.LHCI_ROUTES || "/")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

// Minimum category scores, enforced on the median of LHCI_RUNS runs. Baseline
// medians are in docs/ci/performance-gates.md; each floor sits a few points
// below the baseline to absorb runner-to-runner variance while still catching
// real regressions.
const minScores = {
  performance: 0.9, // baseline 100
  accessibility: 0.95, // baseline 96 (one pre-existing color-contrast failure)
  "best-practices": 0.9, // baseline 100
  seo: 0.95, // baseline 100
};

// Metric ceilings, also on the median run. Category scores alone can hide a
// large regression in one metric behind headroom in the others. These are the
// Core Web Vitals "good" boundaries (TBT stands in for INP in a lab run).
const maxMetrics = {
  "largest-contentful-paint": 2500, // ms, baseline ~620
  "total-blocking-time": 300, // ms, baseline 0
  "cumulative-layout-shift": 0.1, // baseline 0
};

/** @type {import('@lhci/cli').LighthouseRcFile} */
module.exports = {
  ci: {
    collect: {
      url: routes.map((route) => `${origin}${route}`),
      numberOfRuns: Number(process.env.LHCI_RUNS || 5),
      ...(baseUrl
        ? {}
        : {
            startServerCommand: `npx next start -p ${port}`,
            startServerReadyPattern: "Ready in|started server on",
            startServerReadyTimeout: 60000,
          }),
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --headless=new --disable-dev-shm-usage",
        // Vercel preview deployments can sit behind Deployment Protection; the
        // bypass header lets CI through without making the preview public.
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? {
              extraHeaders: JSON.stringify({
                "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              }),
            }
          : {}),
      },
    },
    assert: {
      assertions: {
        ...Object.fromEntries(
          Object.entries(minScores).map(([category, minScore]) => [
            `categories:${category}`,
            ["error", { minScore, aggregationMethod: "median-run" }],
          ])
        ),
        ...Object.fromEntries(
          Object.entries(maxMetrics).map(([audit, maxNumericValue]) => [
            audit,
            ["error", { maxNumericValue, aggregationMethod: "median-run" }],
          ])
        ),
      },
    },
    upload: {
      // Reports stay inside the workflow run (uploaded as an artifact) instead
      // of a public third-party store.
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
