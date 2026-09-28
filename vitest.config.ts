import { configDefaults, defineConfig } from "vitest/config";
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
    // e2e/ is Playwright's, not Vitest's. Both runners default to `*.spec.ts`,
    // so without this the Playwright suite would be collected by `npm run test`
    // and fail on the missing `test()` runner. `configDefaults.exclude` is
    // spread in so Vitest's own defaults (node_modules, dist, …) survive.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
