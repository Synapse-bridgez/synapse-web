import { describe, it, expect, vi, afterEach } from "vitest";
import { buildMockTx, buildMockEvent, withMockSorobanProvider } from "./index";

describe("buildMockTx", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a transaction with sensible defaults", () => {
    const tx = buildMockTx();
    expect(tx).toMatchObject({
      id: "mock-tx-1",
      asset: "USDC",
      amount: 100,
      status: "PENDING",
      from: "GFROM",
      to: "GTO",
      memo: "",
      callback_url: "",
      retries: 0,
    });
  });

  it("applies overrides on top of defaults", () => {
    const tx = buildMockTx({ id: "tx-42", status: "COMPLETED", amount: 7 });
    expect(tx.id).toBe("tx-42");
    expect(tx.status).toBe("COMPLETED");
    expect(tx.amount).toBe(7);
    expect(tx.asset).toBe("USDC");
  });

  it("uses the current time for timestamp and created_at", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const tx = buildMockTx();
    expect(tx.timestamp).toBe(1_700_000_000_000);
    expect(tx.created_at).toBe(1_700_000_000_000);
  });

  it("handles an empty overrides object and zero/empty values", () => {
    expect(buildMockTx({})).toMatchObject({ id: "mock-tx-1" });
    const tx = buildMockTx({ amount: 0, memo: "" });
    expect(tx.amount).toBe(0);
    expect(tx.memo).toBe("");
  });

  it("returns a fresh object on every call", () => {
    const a = buildMockTx();
    const b = buildMockTx();
    expect(a).not.toBe(b);
    a.memo = "changed";
    expect(b.memo).toBe("");
  });

  it("does not mutate the overrides argument", () => {
    const overrides = { id: "x" };
    buildMockTx(overrides);
    expect(overrides).toEqual({ id: "x" });
  });

  it("lets an explicit undefined override replace a default (shallow spread)", () => {
    const tx = buildMockTx({ memo: undefined } as never);
    expect(tx.memo).toBeUndefined();
  });
});

describe("buildMockEvent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an event with sensible defaults", () => {
    const evt = buildMockEvent();
    expect(evt).toMatchObject({
      id: "mock-evt-1",
      type: "StatusChanged",
      txId: "mock-tx-1",
      fromStatus: "PENDING",
      toStatus: "PROCESSING",
      ledger: 100,
      raw: {},
    });
  });

  it("applies overrides on top of defaults", () => {
    const evt = buildMockEvent({ toStatus: "COMPLETED", ledger: 250 });
    expect(evt.toStatus).toBe("COMPLETED");
    expect(evt.ledger).toBe(250);
    expect(evt.fromStatus).toBe("PENDING");
  });

  it("uses the current time for timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    expect(buildMockEvent().timestamp).toBe(1_700_000_000_000);
  });

  it("handles an empty overrides object and a zero ledger", () => {
    expect(buildMockEvent({})).toMatchObject({ id: "mock-evt-1" });
    expect(buildMockEvent({ ledger: 0 }).ledger).toBe(0);
  });

  it("returns a fresh object with an independent raw payload each call", () => {
    const a = buildMockEvent();
    const b = buildMockEvent();
    expect(a).not.toBe(b);
    expect(a.raw).not.toBe(b.raw);
  });

  it("does not mutate the overrides argument", () => {
    const overrides = { id: "evt-9" };
    buildMockEvent(overrides);
    expect(overrides).toEqual({ id: "evt-9" });
  });

  it("lets an explicit undefined override replace a default (shallow spread)", () => {
    const evt = buildMockEvent({ txId: undefined } as never);
    expect(evt.txId).toBeUndefined();
  });
});
