import { describe, it, expect } from "vitest";
import {
  mergeTransactionEvents,
  nativeToTransaction,
  PLACEHOLDER_MARKER,
} from "./transactionMerge";
import { MOCK_TXS } from "@/lib/mock-data";
import type { NormalizedSorobanEvent } from "./events";
import type { Transaction } from "@/lib/types";

const KNOWN_TX_ID = MOCK_TXS[0]!.id;

function statusChangedEvent(
  overrides: Partial<NormalizedSorobanEvent> = {}
): NormalizedSorobanEvent {
  return {
    id: "evt-1",
    type: "StatusChanged",
    txId: KNOWN_TX_ID,
    fromStatus: "PENDING",
    toStatus: "PROCESSING",
    timestamp: Date.now(),
    ledger: 100,
    raw: {} as NormalizedSorobanEvent["raw"],
    ...overrides,
  };
}

function registeredEvent(overrides: Partial<NormalizedSorobanEvent> = {}): NormalizedSorobanEvent {
  return {
    id: "evt-2",
    type: "TransactionRegistered",
    txId: "brand-new-tx-id",
    timestamp: Date.now(),
    ledger: 101,
    raw: {} as NormalizedSorobanEvent["raw"],
    ...overrides,
  };
}

describe("mergeTransactionEvents", () => {
  it("returns the mock baseline unchanged when there are no events", () => {
    expect(mergeTransactionEvents([])).toEqual(MOCK_TXS);
  });

  it("updates the status of a known transaction on StatusChanged", () => {
    const result = mergeTransactionEvents([statusChangedEvent()]);
    const updated = result.find((tx) => tx.id === KNOWN_TX_ID);
    expect(updated?.status).toBe("PROCESSING");
  });

  it("ignores StatusChanged events for unknown tx ids", () => {
    const event = statusChangedEvent({ txId: "does-not-exist" });
    expect(mergeTransactionEvents([event])).toEqual(MOCK_TXS);
  });

  it("inserts a placeholder row for a new TransactionRegistered id", () => {
    const result = mergeTransactionEvents([registeredEvent()]);
    expect(result).toHaveLength(MOCK_TXS.length + 1);
    const placeholder = result.find((tx) => tx.id === "brand-new-tx-id");
    expect(placeholder).toMatchObject({
      asset: PLACEHOLDER_MARKER,
      status: "PENDING",
      from: PLACEHOLDER_MARKER,
      to: PLACEHOLDER_MARKER,
    });
  });

  it("does not duplicate a placeholder for an id that already exists", () => {
    const event = registeredEvent({ txId: KNOWN_TX_ID });
    const result = mergeTransactionEvents([event]);
    expect(result).toHaveLength(MOCK_TXS.length);
  });

  it("applies multiple events in order", () => {
    const result = mergeTransactionEvents([
      registeredEvent(),
      statusChangedEvent({ txId: "brand-new-tx-id", toStatus: "COMPLETED" }),
    ]);
    const tx = result.find((t) => t.id === "brand-new-tx-id");
    expect(tx?.status).toBe("COMPLETED");
  });
});

describe("nativeToTransaction", () => {
  const fallback: Transaction = {
    id: "tx-1",
    asset: PLACEHOLDER_MARKER,
    amount: 0,
    status: "PENDING",
    timestamp: 1000,
    from: PLACEHOLDER_MARKER,
    to: PLACEHOLDER_MARKER,
    memo: "",
    callback_url: "",
    retries: 0,
    created_at: 1000,
  };

  it("maps matching fields from the decoded struct", () => {
    const native = {
      asset: "USDC",
      amount: 42,
      status: "completed",
      from: "GFROM",
      to: "GTO",
      memo: "hello",
      callback_url: "https://cb",
      retries: 2,
      created_at: 500,
    };
    expect(nativeToTransaction("tx-1", native, fallback)).toEqual({
      id: "tx-1",
      asset: "USDC",
      amount: 42,
      status: "COMPLETED",
      timestamp: fallback.timestamp,
      from: "GFROM",
      to: "GTO",
      memo: "hello",
      callback_url: "https://cb",
      retries: 2,
      created_at: 500,
    });
  });

  it("falls back to placeholder fields when the decoded value isn't an object", () => {
    expect(nativeToTransaction("tx-1", "not-an-object", fallback)).toEqual(fallback);
    expect(nativeToTransaction("tx-1", null, fallback)).toEqual(fallback);
  });

  it("falls back field-by-field when types don't match", () => {
    const native = { asset: 123, amount: "not-a-number" };
    const result = nativeToTransaction("tx-1", native, fallback);
    expect(result.asset).toBe(fallback.asset);
    expect(result.amount).toBe(fallback.amount);
  });
});
