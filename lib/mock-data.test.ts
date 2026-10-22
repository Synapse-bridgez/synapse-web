import { describe, it, expect } from "vitest";
import { MOCK_TXS } from "./mock-data";

describe("MOCK_TXS", () => {
  it("contains four transactions", () => {
    expect(MOCK_TXS).toHaveLength(4);
  });

  it("covers each status once", () => {
    expect(MOCK_TXS.map((t) => t.status)).toEqual([
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
    ]);
  });

  it("has every required field with the expected type", () => {
    for (const tx of MOCK_TXS) {
      expect(typeof tx.id).toBe("string");
      expect(typeof tx.asset).toBe("string");
      expect(typeof tx.amount).toBe("number");
      expect(typeof tx.status).toBe("string");
      expect(typeof tx.timestamp).toBe("number");
      expect(typeof tx.from).toBe("string");
      expect(typeof tx.to).toBe("string");
      expect(typeof tx.memo).toBe("string");
      expect(typeof tx.callback_url).toBe("string");
      expect(typeof tx.retries).toBe("number");
      expect(typeof tx.created_at).toBe("number");
    }
  });

  it("has unique ids and unique from/to addresses", () => {
    const ids = MOCK_TXS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const addrs = MOCK_TXS.flatMap((t) => [t.from, t.to]);
    expect(new Set(addrs).size).toBe(addrs.length);
  });

  it("has positive amounts and non-negative integer retries", () => {
    for (const tx of MOCK_TXS) {
      expect(tx.amount).toBeGreaterThan(0);
      expect(Number.isInteger(tx.retries)).toBe(true);
      expect(tx.retries).toBeGreaterThanOrEqual(0);
    }
  });

  it("has timestamps in the past, ordered newest to oldest, matching created_at", () => {
    const now = Date.now();
    for (const tx of MOCK_TXS) {
      expect(tx.timestamp).toBeLessThanOrEqual(now);
      expect(tx.created_at).toBe(tx.timestamp);
    }
    const ts = MOCK_TXS.map((t) => t.timestamp);
    expect([...ts].sort((a, b) => b - a)).toEqual(ts);
  });

  it("has well-formed callback URLs and memos", () => {
    for (const tx of MOCK_TXS) {
      expect(() => new URL(tx.callback_url)).not.toThrow();
      expect(tx.memo).not.toBe("");
    }
  });

  it("has more retries on the failed transaction than the pending one", () => {
    const failed = MOCK_TXS.find((t) => t.status === "FAILED");
    const pending = MOCK_TXS.find((t) => t.status === "PENDING");
    expect(failed).toBeDefined();
    expect(pending).toBeDefined();
    expect(failed!.retries).toBeGreaterThan(pending!.retries);
  });

  it("returns undefined when looking up an unknown id", () => {
    expect(MOCK_TXS.find((t) => t.id === "does-not-exist")).toBeUndefined();
  });
});
