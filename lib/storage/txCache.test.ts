import { describe, it, expect, afterEach, vi } from "vitest";
import { TxCache, txCache, normalizeTx, DEFAULT_RETENTION_CAP } from "./txCache";
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

describe("txCache (in-memory fallback, no IndexedDB)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function withoutIndexedDB() {
    vi.stubGlobal("indexedDB", undefined);
  }

  it("exports a shared default instance and default cap", () => {
    expect(txCache).toBeInstanceOf(TxCache);
    expect(DEFAULT_RETENTION_CAP).toBe(5000);
  });

  it("reports non-persistent when indexedDB is unavailable", () => {
    withoutIndexedDB();
    expect(new TxCache().isPersistent).toBe(false);
  });

  it("normalizeTx keeps only persisted fields", () => {
    const out = normalizeTx(makeTx("a", 1, { junk: true }));
    expect(out).not.toHaveProperty("junk");
    expect(out.id).toBe("a");
  });

  it("stores and returns transactions newest first", async () => {
    withoutIndexedDB();
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1), makeTx("b", 3), makeTx("c", 2)]);
    const all = await cache.getAll();
    expect(all.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("dedupes by id", async () => {
    withoutIndexedDB();
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1, { status: "pending" })]);
    await cache.putMany([makeTx("a", 1, { status: "completed" })]);
    const all = await cache.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("completed");
  });

  it("is a no-op for an empty batch", async () => {
    withoutIndexedDB();
    const cache = new TxCache();
    await cache.putMany([]);
    expect(await cache.getAll()).toEqual([]);
  });

  it("evicts oldest records beyond the retention cap", async () => {
    withoutIndexedDB();
    const cache = new TxCache({ retentionCap: 2 });
    await cache.putMany([makeTx("a", 1), makeTx("b", 2), makeTx("c", 3)]);
    const all = await cache.getAll();
    expect(all.map((t) => t.id)).toEqual(["c", "b"]);
  });

  it("clear removes all records", async () => {
    withoutIndexedDB();
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1)]);
    await cache.clear();
    expect(await cache.getAll()).toEqual([]);
  });

  it("falls back to memory when indexedDB.open throws", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new Error("denied");
      },
    });
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1)]);
    expect((await cache.getAll()).map((t) => t.id)).toEqual(["a"]);
  });

  it("falls back to memory when the open request errors", async () => {
    vi.stubGlobal("indexedDB", {
      open: () => {
        const req: Record<string, unknown> = {};
        queueMicrotask(() => (req.onerror as () => void)());
        return req;
      },
    });
    const cache = new TxCache();
    await cache.putMany([makeTx("a", 1)]);
    expect((await cache.getAll()).map((t) => t.id)).toEqual(["a"]);
  });
});
