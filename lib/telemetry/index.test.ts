import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  scrubContext,
  isTelemetryEnabled,
  reportError,
  setTelemetryProvider,
} from "./index";

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

describe("reportError", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TELEMETRY_DISABLED", "false");
  });

  afterEach(() => {
    setTelemetryProvider(null);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends the error and scrubbed context to the provider", () => {
    const provider = vi.fn();
    setTelemetryProvider(provider);
    const err = new Error("boom");
    reportError(err, { tabName: "bridge", privateKey: "secret" });
    expect(provider).toHaveBeenCalledWith(err, { tabName: "bridge" });
  });

  it("falls back to console.error when no provider is set", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    reportError(err);
    expect(spy).toHaveBeenCalledWith("[telemetry] unhandled error", err, {});
  });

  it("is a no-op when telemetry is disabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    const provider = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    setTelemetryProvider(provider);
    reportError(new Error("boom"));
    expect(provider).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
