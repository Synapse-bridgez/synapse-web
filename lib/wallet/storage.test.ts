import { describe, it, expect, beforeEach } from "vitest";
import { getStoredWalletId, storeSelectedWalletId, clearSelectedWalletId } from "./storage";

describe("wallet storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns undefined when nothing is stored", () => {
    expect(getStoredWalletId()).toBeUndefined();
  });

  it("round-trips a stored wallet id", () => {
    storeSelectedWalletId("freighter");
    expect(getStoredWalletId()).toBe("freighter");
  });

  it("overwrites a previously stored id", () => {
    storeSelectedWalletId("freighter");
    storeSelectedWalletId("xbull");
    expect(getStoredWalletId()).toBe("xbull");
  });

  it("clears the stored id", () => {
    storeSelectedWalletId("freighter");
    clearSelectedWalletId();
    expect(getStoredWalletId()).toBeUndefined();
  });
});
