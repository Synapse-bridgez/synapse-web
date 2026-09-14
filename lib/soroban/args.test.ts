import { describe, it, expect } from "vitest";
import { scValToNative, Address } from "@stellar/stellar-sdk";
import { addressArg, stringArg, structArg } from "./args";

const TEST_ADDRESS = "GAAO3OLP52EB7PW5SINKUABOFKCLRADZXEVNZKIHYU3FJOQ4AZUEEH5J";

describe("addressArg", () => {
  it("encodes a G... address as an ScVal address that round-trips", () => {
    const scVal = addressArg(TEST_ADDRESS);
    expect(scValToNative(scVal)).toBe(TEST_ADDRESS);
  });

  it("throws for an invalid address string", () => {
    expect(() => addressArg("not-an-address")).toThrow();
  });

  it("matches Address.fromString for the same key", () => {
    const scVal = addressArg(TEST_ADDRESS);
    expect(scVal.toXDR("base64")).toBe(Address.fromString(TEST_ADDRESS).toScVal().toXDR("base64"));
  });
});

describe("stringArg", () => {
  it("encodes a plain string that round-trips", () => {
    const scVal = stringArg("550e8400-e29b-41d4-a716-446655440000");
    expect(scValToNative(scVal)).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("handles an empty string", () => {
    expect(scValToNative(stringArg(""))).toBe("");
  });
});

describe("structArg", () => {
  it("encodes a plain object as a map that round-trips", () => {
    const payload = {
      tx_id: "abc-123",
      callback_url: "https://example.com/cb",
      secret: "hmac-secret",
    };
    const scVal = structArg(payload);
    expect(scValToNative(scVal)).toEqual(payload);
  });
});
