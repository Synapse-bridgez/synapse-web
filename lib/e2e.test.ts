import { describe, it, expect, afterEach, vi } from "vitest";
import { getE2EMocks } from "./e2e";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.__SYNAPSE_E2E__;
});

describe("getE2EMocks", () => {
  it("returns undefined when test mode is not enabled", () => {
    window.__SYNAPSE_E2E__ = { simulateContractCall: async () => "x" };
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "0");
    expect(getE2EMocks()).toBeUndefined();
  });

  it("returns undefined when the env var is unset", () => {
    window.__SYNAPSE_E2E__ = {};
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "");
    expect(getE2EMocks()).toBeUndefined();
  });

  it("returns the window mocks when test mode is enabled", () => {
    const mocks = { simulateContractCall: async () => "ok" };
    window.__SYNAPSE_E2E__ = mocks;
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "1");
    expect(getE2EMocks()).toBe(mocks);
  });

  it("returns undefined when enabled but no mocks are installed", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "1");
    expect(getE2EMocks()).toBeUndefined();
  });

  it("returns undefined when window is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "1");
    vi.stubGlobal("window", undefined);
    expect(getE2EMocks()).toBeUndefined();
  });
});
