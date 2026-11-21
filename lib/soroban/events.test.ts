import { describe, it, expect, vi, beforeEach } from "vitest";

const trackEvent = vi.fn();
vi.mock("@/lib/telemetry", () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));

const getEvents = vi.fn();
const getLatestLedger = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: vi.fn().mockImplementation(() => ({ getEvents, getLatestLedger })),
  },
}));

import { createSorobanEventPoller } from "./events";

function makeEvent(id: string, type: string) {
  return {
    id,
    type: "contract",
    ledger: 100,
    ledgerClosedAt: "2024-01-01T00:00:00Z",
    contractId: "C...",
    topic: [{ toString: () => type }, { toString: () => `tx-${id}` }],
    value: { toString: () => "" },
  };
}

describe("createSorobanEventPoller", () => {
  beforeEach(() => {
    trackEvent.mockClear();
    getEvents.mockReset();
    getLatestLedger.mockReset();
    getLatestLedger.mockResolvedValue({ sequence: 1 });
  });

  it("returns good events and reports the malformed one", async () => {
    const good = makeEvent("1", "TransactionRegistered");
    const bad = {
      id: "2",
      get topic() {
        throw new Error("schema changed");
      },
    };
    const good2 = makeEvent("3", "StatusChanged");

    getEvents.mockResolvedValue({ events: [good, bad, good2] });

    const poller = createSorobanEventPoller("https://rpc.test", "C...");
    const received: string[] = [];
    poller.onEvents((events) => received.push(...events.map((e) => e.id)));

    await poller.poll();

    expect(received).toEqual(["1", "3"]);
    expect(trackEvent).toHaveBeenCalledWith(
      "soroban_event_parse_failed",
      expect.objectContaining({ eventId: "2", error: "schema changed" })
    );
  });
});
