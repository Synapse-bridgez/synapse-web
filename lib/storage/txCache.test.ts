import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DEFAULT_RETENTION_CAP, normalizeTx, TxCache } from "./txCache";
import { buildMockTx } from "../soroban/test-utils";

// Force the in-memory fallback so tests never touch a real IndexedDB.
beforeEach(() => {
  vi.stubGlobal("indexedDB", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DEFAULT_RETENTION_CAP", () => {
  it("is a positive integer equal to 5000", () => {
    expect(DEFAULT_RETENTION_CAP).toBe(5000);
    expect(Number.isInteger(DEFAULT_RETENTION_CAP)).toBe(true);
  });

  it("is used when no retentionCap option is given", async () => {
    const cache = new TxCache();
    const txs = Array.from({ length: DEFAULT_RETENTION_CAP + 3 }, (_, i) =>
      buildMockTx({ id: `tx-${i}`, timestamp: i }),
    );
    await cache.putMany(txs);
    const all = await cache.getAll();
    expect(all).toHaveLength(DEFAULT_RETENTION_CAP);
    expect(all[all.length - 1].id).toBe("tx-3");
  });
});

describe("normalizeTx", () => {
  it("keeps only persisted fields", () => {
    const tx = buildMockTx({ id: "a", memo: "hi" });
    const dirty = { ...tx, extra: "nope" } as typeof tx;
    const result = normalizeTx(dirty);
    expect(result).toEqual(tx);
    expect(result).not.toHaveProperty("extra");
  });

  it("returns a new object and does not mutate input", () => {
    const tx = buildMockTx();
    const copy = { ...tx };
    const result = normalizeTx(tx);
    expect(result).not.toBe(tx);
    expect(tx).toEqual(copy);
  });

  it("maps missing optional fields to undefined", () => {
    const partial = { id: "x" } as unknown as ReturnType<typeof buildMockTx>;
    const result = normalizeTx(partial);
    expect(result.id).toBe("x");
    expect(result.memo).toBeUndefined();
    expect(result.amount).toBeUndefined();
  });
});
