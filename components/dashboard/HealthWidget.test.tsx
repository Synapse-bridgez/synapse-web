import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HealthWidget from "./HealthWidget";
import * as sorobanStatusModule from "../../lib/soroban/useSorobanStatus";

describe("HealthWidget Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders healthy state when RPC is connected, latency is normal, and event is fresh", () => {
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "5s ago",
      health: {
        connected: true,
        latencyMs: 120,
        lastEventTimestamp: Date.now() - 5000,
        error: null,
      } as any,
      activeEndpoint: "https://soroban-testnet.stellar.org",
      endpoints: [],
      isFailingOver: false,
    });

    render(<HealthWidget />);

    expect(screen.getByText("Platform Health")).toBeDefined();
    expect(screen.getByText("Healthy")).toBeDefined();
    expect(screen.getByText("Reachable")).toBeDefined();
    expect(screen.getByText("120 ms")).toBeDefined();
    expect(screen.getByText(/s ago/i)).toBeDefined();
  });

  it("renders degraded state when latency exceeds slowLatencyMs", () => {
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "2s ago",
      health: {
        connected: true,
        latencyMs: 2500,
        lastEventTimestamp: Date.now() - 2000,
        error: null,
      } as any,
      activeEndpoint: "https://soroban-testnet.stellar.org",
      endpoints: [],
      isFailingOver: false,
    });

    render(<HealthWidget slowLatencyMs={1000} />);

    expect(screen.getByText("Degraded")).toBeDefined();
    expect(screen.getByText("Reachable")).toBeDefined();
    expect(screen.getByText("2.50 s")).toBeDefined();
  });

  it("renders degraded state when event freshness exceeds staleAfterMs", () => {
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "60s ago",
      health: {
        connected: true,
        latencyMs: 100,
        lastEventTimestamp: Date.now() - 60_000,
        error: null,
      } as any,
      activeEndpoint: "https://soroban-testnet.stellar.org",
      endpoints: [],
      isFailingOver: false,
    });

    render(<HealthWidget staleAfterMs={30_000} />);

    expect(screen.getByText("Degraded")).toBeDefined();
  });

  it("renders degraded state when lastEventTimestamp is null or missing", () => {
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: null,
      health: {
        connected: true,
        latencyMs: 100,
        lastEventTimestamp: null,
        error: null,
      } as any,
      activeEndpoint: "https://soroban-testnet.stellar.org",
      endpoints: [],
      isFailingOver: false,
    });

    render(<HealthWidget />);

    expect(screen.getByText("Degraded")).toBeDefined();
    expect(screen.getByText("never")).toBeDefined();
  });

  it("renders down state when status is not connected", () => {
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "disconnected",
      lastEventAge: null,
      health: {
        connected: false,
        latencyMs: null,
        lastEventTimestamp: null,
        error: new Error("RPC disconnected"),
      } as any,
      activeEndpoint: null,
      endpoints: [],
      isFailingOver: false,
    });

    render(<HealthWidget />);

    expect(screen.getByText("Down")).toBeDefined();
    expect(screen.getByText("Unreachable")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByText("never")).toBeDefined();
  });

  it("handles latency and time formatting edge cases", () => {
    // Test future timestamp (just now) and minutes ago
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "10m ago",
      health: {
        connected: true,
        latencyMs: Number.NaN,
        lastEventTimestamp: tenMinutesAgo,
        error: null,
      } as any,
      activeEndpoint: null,
      endpoints: [],
      isFailingOver: false,
    });

    const { rerender } = render(<HealthWidget />);
    expect(screen.getByText("10m ago")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();

    // Hours ago
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "2h ago",
      health: {
        connected: true,
        latencyMs: 500,
        lastEventTimestamp: twoHoursAgo,
        error: null,
      } as any,
      activeEndpoint: null,
      endpoints: [],
      isFailingOver: false,
    });

    rerender(<HealthWidget />);
    expect(screen.getByText("2h ago")).toBeDefined();
    expect(screen.getByText("500 ms")).toBeDefined();

    // Future timestamp
    const futureTime = Date.now() + 5000;
    vi.spyOn(sorobanStatusModule, "useSorobanStatus").mockReturnValue({
      status: "connected",
      lastEventAge: "just now",
      health: {
        connected: true,
        latencyMs: 500,
        lastEventTimestamp: futureTime,
        error: null,
      } as any,
      activeEndpoint: null,
      endpoints: [],
      isFailingOver: false,
    });

    rerender(<HealthWidget />);
    expect(screen.getByText("just now")).toBeDefined();
  });
});
