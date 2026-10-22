import { describe, it, expect } from "vitest";
import { isValidStellarAddress } from "./schemas";

const VALID_FORMAT_BAD_CHECKSUM = "G" + "A".repeat(55);

describe("isValidStellarAddress", () => {
  it("rejects non-string input", () => {
    for (const v of [undefined, null, 42, {}, []]) {
      expect(isValidStellarAddress(v as unknown as string)).toBe(false);
    }
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(isValidStellarAddress("")).toBe(false);
    expect(isValidStellarAddress("   ")).toBe(false);
  });

  it("rejects addresses with the wrong length", () => {
    expect(isValidStellarAddress("G" + "A".repeat(54))).toBe(false);
    expect(isValidStellarAddress("G" + "A".repeat(56))).toBe(false);
    expect(isValidStellarAddress("GABC")).toBe(false);
  });

  it("rejects addresses with an unsupported prefix", () => {
    expect(isValidStellarAddress("S" + "A".repeat(55))).toBe(false);
    expect(isValidStellarAddress("M" + "A".repeat(55))).toBe(false);
    expect(isValidStellarAddress("A" + "A".repeat(55))).toBe(false);
  });

  it("rejects lowercase and non-base32 characters", () => {
    expect(isValidStellarAddress("g" + "A".repeat(55))).toBe(false);
    expect(isValidStellarAddress("G" + "a".repeat(55))).toBe(false);
    expect(isValidStellarAddress("G" + "A".repeat(54) + "1")).toBe(false);
    expect(isValidStellarAddress("G" + "A".repeat(54) + "0")).toBe(false);
    expect(isValidStellarAddress("G" + "A".repeat(54) + "!")).toBe(false);
  });

  it("rejects well-formed G and C addresses whose checksum does not match", () => {
    expect(isValidStellarAddress(VALID_FORMAT_BAD_CHECKSUM)).toBe(false);
    expect(isValidStellarAddress("C" + "A".repeat(55))).toBe(false);
  });

  it("does not throw on malformed input", () => {
    expect(() => isValidStellarAddress("\u0000".repeat(56))).not.toThrow();
    expect(() => isValidStellarAddress("G" + "A".repeat(54) + "\n")).not.toThrow();
  });
});
