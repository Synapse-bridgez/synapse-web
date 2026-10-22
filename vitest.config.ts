import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vitest loads vitest.config.ts before vitest.config.mts, so this file is the
// one `npm test` actually uses. It mirrors vitest.config.mts but runs on jsdom,
// which is the DOM environment installed in devDependencies.
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
    server: {
      deps: {
        inline: ["@stellar/freighter-api", "@creit.tech/stellar-wallets-kit"],
      },
    },
  },
});
