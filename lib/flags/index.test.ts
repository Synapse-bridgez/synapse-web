import { describe, expect, it } from "vitest";
import * as flags from "./index";

describe("lib/flags barrel", () => {
  it("re-exports evaluation helpers", () => {
    for (const name of ["fnv1a", "bucketOf", "isInRollout", "envVarFor", "resolveFlag", "resolveAll"]) {
      expect(typeof (flags as Record<string, unknown>)[name]).toBe("function");
    }
  });

  it("re-exports remote config API", () => {
    expect(typeof flags.CACHE_KEY).toBe("string");
    expect(typeof flags.FRESHNESS_WINDOW_MS).toBe("number");
    expect(typeof flags.DEFAULT_TIMEOUT_MS).toBe("number");
    for (const name of ["validateRemoteFlags", "parseRemoteFlags", "readCache", "writeCache", "loadFlags"]) {
      expect(typeof (flags as Record<string, unknown>)[name]).toBe("function");
    }
  });

  it("re-exports flag definitions", () => {
    expect(flags.FLAGS).toBeDefined();
    expect(flags.REGISTRY).toBeDefined();
    expect(flags.FLAG_KEYS.length).toBeGreaterThan(0);
    expect(typeof flags.visibleTabs).toBe("function");
    expect(typeof flags.resolveActiveTab).toBe("function");
  });

  it("re-exports the React provider and hooks", () => {
    expect(flags.FlagProvider).toBeDefined();
    expect(typeof flags.useFlag).toBe("function");
    expect(typeof flags.useFlags).toBe("function");
  });
});
