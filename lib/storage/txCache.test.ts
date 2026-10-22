import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DEFAULT_RETENTION_CAP, normalizeTx, TxCache, txCache } from "./txCache";
import { buildMockTx } from "../soroban/test-utils";
import type { Transaction } from "@/lib/types";

function makeTx(id: string, timestamp: number, extra: Record<string, unknown> = {}): Transaction {
  return {
    id,
    asset: "USDC",
    amount: "10",
    status: "completed",
    timestamp,
    from: "GFROM",
    to: "GTO",
    ...extra,
  } as unknown as Transaction;
}

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

describe("TxCache (in-memory fallback)", () => {
  it("exports a shared default instance", () => {
    expect(txCache).toBeInstanceOf(TxCache);
  });

  it("reports non-persistent without IndexedDB", () => {
    expect(new TxCache().isPersistent).toBe(false);
  });

  it("ignores empty batches", async () => {
    const cache = new TxCache();
    await cache.putMany([]);
    expect(await cache.getAll()).toEqual([]);
  });

  it("stores and returns transactions newest first", async () => {
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1), makeTx("b", 3), makeTx("c", 2)]);
    const all = await cache.getAll();
    expect(all.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("dedupes by id", async () => {
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1, { status: "pending" })]);
    await cache.putMany([makeTx("a", 1, { status: "completed" })]);
    const all = await cache.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("completed");
  });

  it("evicts oldest records beyond the retention cap", async () => {
    const cache = new TxCache({ retentionCap: 2 });
    await cache.putMany([makeTx("a", 1), makeTx("b", 2), makeTx("c", 3)]);
    const all = await cache.getAll();
    expect(all.map((t) => t.id)).toEqual(["c", "b"]);
  });

  it("clear removes all records", async () => {
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1)]);
    await cache.clear();
    expect(await cache.getAll()).toEqual([]);
  });
});
    const cache = new TxCache();
    await cache.putMany([]);
    expect(await cache.getAll()).toEqual([]);
  });

  it("stores records and returns them newest first", async () => {
    const cache = new TxCache();
    await cache.putMany([
      buildMockTx({ id: "old", timestamp: 1 }),
      buildMockTx({ id: "new", timestamp: 3 }),
      buildMockTx({ id: "mid", timestamp: 2 }),
    ]);
    expect((await cache.getAll()).map((t) => t.id)).toEqual(["new", "mid", "old"]);
  });

  it("upserts by id", async () => {
    const cache = new TxCache();
    await cache.putMany([buildMockTx({ id: "a", status: "PENDING" })]);
    await cache.putMany([buildMockTx({ id: "a", status: "COMPLETED" })]);
    const all = await cache.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("COMPLETED");
  });

  it("evicts oldest records beyond retentionCap", async () => {
    const cache = new TxCache({ retentionCap: 2 });
    await cache.putMany([
      buildMockTx({ id: "a", timestamp: 1 }),
      buildMockTx({ id: "b", timestamp: 2 }),
      buildMockTx({ id: "c", timestamp: 3 }),
    ]);
    expect((await cache.getAll()).map((t) => t.id)).toEqual(["c", "b"]);
  });

  it("clear removes everything", async () => {
    const cache = new TxCache();
    await cache.putMany([buildMockTx({ id: "a" })]);
    await cache.clear();
    expect(await cache.getAll()).toEqual([]);
  });

  it("falls back to memory when indexedDB.open throws", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new Error("denied");
      },
    });
    const cache = new TxCache({ dbName: "test-db" });
    await cache.putMany([buildMockTx({ id: "a" })]);
    expect((await cache.getAll()).map((t) => t.id)).toEqual(["a"]);
  });

  it("falls back to memory when open errors", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => (req.onerror as () => void)());
        return req;
      },
    });
    const cache = new TxCache();
    await cache.putMany([buildMockTx({ id: "a" })]);
    expect(await cache.getAll()).toHaveLength(1);
  });
});
