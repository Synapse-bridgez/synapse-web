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
  server: {
    deps: {
      inline: ["@creit.tech/stellar-wallets-kit", "@stellar/freighter-api"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    server: {
      deps: {
        inline: ["@creit.tech/stellar-wallets-kit", "@stellar/freighter-api"],
      },
    },
  },
});
