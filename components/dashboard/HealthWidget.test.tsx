// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ConnectionStatus } from "@/lib/soroban/useSorobanStatus";
import type { RpcHealth } from "@/lib/soroban/events";
import HealthWidget from "./HealthWidget";

const mockUseSorobanStatus = vi.fn();

vi.mock("@/lib/soroban/useSorobanStatus", () => ({
  useSorobanStatus: () => mockUseSorobanStatus(),
}));

const NOW = new Date("2026-06-01T12:00:00.000Z").getTime();

interface StatusOverrides {
  status?: ConnectionStatus;
  lastEventAge?: string | null;
  health?: Partial<RpcHealth>;
}

function makeStatus(overrides: StatusOverrides = {}) {
  return {
    status: overrides.status ?? "connected",
    lastEventAge: overrides.lastEventAge ?? null,
    health: {
      connected: (overrides.status ?? "connected") === "connected",
      lastCheck: NOW,
      lastEventTimestamp: NOW - 5_000,
      error: overrides.status === "error" ? "RPC timeout" : null,
      latencyMs: 120,
      ...overrides.health,
    },
    activeEndpoint: null,
    endpoints: [],
    isFailingOver: false,
  };
}

describe("HealthWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockUseSorobanStatus.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe("health state classification", () => {
    it("renders Healthy when connected with fast latency and recent event", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 120, lastEventTimestamp: NOW - 5_000 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Healthy");
      expect(screen.getByText("Reachable")).toBeInTheDocument();
      expect(screen.getByText("120 ms")).toBeInTheDocument();
      expect(screen.getByText("5s ago")).toBeInTheDocument();
    });

    it("renders Down and Unreachable when disconnected", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "disconnected",
          health: { connected: false, latencyMs: null, lastEventTimestamp: null },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Down");
      expect(screen.getByText("Unreachable")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.getByText("never")).toBeInTheDocument();
    });

    it("renders Down when status is error even if event timestamp and latency are fresh", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "error",
          health: {
            connected: false,
            error: "503 Service Unavailable",
            latencyMs: 85,
            lastEventTimestamp: NOW - 1_000,
          },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Down");
      expect(screen.getByText("Unreachable")).toBeInTheDocument();
    });

    it("renders Degraded when connected but latency exceeds default slowLatencyMs", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 1_501, lastEventTimestamp: NOW - 2_000 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Degraded");
      expect(screen.getByText("Reachable")).toBeInTheDocument();
      expect(screen.getByText("1.50 s")).toBeInTheDocument();
    });

    it("renders Degraded when connected with no processed event timestamp", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 50, lastEventTimestamp: null },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Degraded");
      expect(screen.getByText("Reachable")).toBeInTheDocument();
      expect(screen.getByText("never")).toBeInTheDocument();
    });

    it("renders Degraded when connected but last processed event exceeds default staleAfterMs", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 50, lastEventTimestamp: NOW - 30_001 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Degraded");
      expect(screen.getByText("Reachable")).toBeInTheDocument();
      expect(screen.getByText("30s ago")).toBeInTheDocument();
    });
  });

  describe("latency formatting", () => {
    it.each([
      { latencyMs: null, expected: "—" },
      { latencyMs: undefined, expected: "—" },
      { latencyMs: Number.NaN, expected: "—" },
      { latencyMs: 0, expected: "0 ms" },
      { latencyMs: 249.6, expected: "250 ms" },
      { latencyMs: 999, expected: "999 ms" },
      { latencyMs: 1_000, expected: "1.00 s" },
      { latencyMs: 2_345, expected: "2.35 s" },
    ])("formats latency $latencyMs as $expected", ({ latencyMs, expected }) => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs, lastEventTimestamp: NOW - 1_000 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it("stays Healthy when latency is missing or NaN", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: Number.NaN, lastEventTimestamp: NOW - 1_000 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Healthy");
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("last event timestamp formatting", () => {
    it.each([
      { lastEventTimestamp: null, expected: "never" },
      { lastEventTimestamp: 0, expected: "never" },
      { lastEventTimestamp: NOW + 5_000, expected: "just now" },
      { lastEventTimestamp: NOW, expected: "0s ago" },
      { lastEventTimestamp: NOW - 1, expected: "0s ago" },
      { lastEventTimestamp: NOW - 45_000, expected: "45s ago" },
      { lastEventTimestamp: NOW - 5 * 60_000, expected: "5m ago" },
      { lastEventTimestamp: NOW - 2 * 3_600_000, expected: "2h ago" },
    ])("formats timestamp offset cleanly as $expected", ({ lastEventTimestamp, expected }) => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 100, lastEventTimestamp },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  describe("threshold overrides and boundary conditions", () => {
    it("remains Healthy when latency and event age equal the thresholds", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 1_500, lastEventTimestamp: NOW - 30_000 },
        })
      );

      render(<HealthWidget />);

      expect(screen.getByRole("status")).toHaveTextContent("Healthy");
    });

    it("respects stricter custom slowLatencyMs and staleAfterMs props", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 400, lastEventTimestamp: NOW - 2_000 },
        })
      );

      const { rerender } = render(<HealthWidget slowLatencyMs={300} staleAfterMs={5_000} />);
      expect(screen.getByRole("status")).toHaveTextContent("Degraded");

      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 200, lastEventTimestamp: NOW - 6_000 },
        })
      );
      rerender(<HealthWidget slowLatencyMs={300} staleAfterMs={5_000} />);
      expect(screen.getByRole("status")).toHaveTextContent("Degraded");
    });

    it("respects relaxed custom thresholds so values stay Healthy", () => {
      mockUseSorobanStatus.mockReturnValue(
        makeStatus({
          status: "connected",
          health: { latencyMs: 2_000, lastEventTimestamp: NOW - 45_000 },
        })
      );

      render(<HealthWidget slowLatencyMs={2_500} staleAfterMs={60_000} />);

      expect(screen.getByRole("status")).toHaveTextContent("Healthy");
    });
  });

  describe("accessibility and semantic structure", () => {
    it("exposes accessible region, heading, live status badge, and definition terms", () => {
      mockUseSorobanStatus.mockReturnValue(makeStatus());

      render(<HealthWidget />);

      expect(screen.getByRole("region", { name: "Platform health" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Platform Health" })).toBeInTheDocument();

      const statusBadge = screen.getByRole("status");
      expect(statusBadge).toHaveAttribute("aria-live", "polite");
      const dot = statusBadge.querySelector('[aria-hidden="true"]');
      expect(dot).not.toBeNull();

      expect(screen.getByText("RPC")).toBeInTheDocument();
      expect(screen.getByText("Latency")).toBeInTheDocument();
      expect(screen.getByText("Last processed event")).toBeInTheDocument();
    });
  });
});
