import { describe, it, expect, afterEach, vi } from "vitest";
import { scrubContext, isTelemetryEnabled } from "./index";

describe("scrubContext", () => {
  it("keeps non-sensitive fields as-is", () => {
    const input = { tabName: "bridge", walletAddress: "GABC", walletConnected: true };
    expect(scrubContext(input)).toEqual(input);
  });

  it("strips sensitive keys case-insensitively and by substring", () => {
    const out = scrubContext({
      privateKey: "x",
      SECRET_KEY: "x",
      signedXdr: "x",
      userPassword: "x",
      authHeader: "x",
      accessToken: "x",
      contractId: "C1",
    });
    expect(out).toEqual({ contractId: "C1" });
  });

  it("recursively scrubs nested objects without mutating the input", () => {
    const input = { a: { token: "t", keep: 1, b: { mnemonic: "m", ok: true } } };
    const out = scrubContext(input);
    expect(out).toEqual({ a: { keep: 1, b: { ok: true } } });
    expect(input.a.token).toBe("t");
  });

  it("leaves arrays and null values untouched", () => {
    const arr = [{ token: "t" }];
    expect(scrubContext({ arr, nothing: null })).toEqual({ arr, nothing: null });
  });

  it("returns an empty object for empty input and beyond max depth", () => {
    expect(scrubContext({})).toEqual({});
    expect(scrubContext({ a: 1 }, 7)).toEqual({});
  });
});

describe("isTelemetryEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("is false when explicitly disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_DISABLED", "true");
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("is true in production when not disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_DISABLED", "false");
    expect(isTelemetryEnabled()).toBe(true);
  });
});

