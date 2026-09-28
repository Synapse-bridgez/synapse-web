import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

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
    // The Playwright specs under e2e/ match Vitest's default `**/*.spec.ts`
    // glob, so without this they get collected by `npm test` and die with
    // "Playwright Test did not expect test.describe() to be called here" --
    // which fails the unit-test step in CI. Playwright owns e2e/, Vitest owns
    // the rest; each is invoked by its own script (test / test:e2e).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
});
