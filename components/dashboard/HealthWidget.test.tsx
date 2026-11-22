import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HealthWidget from "./HealthWidget";

const mockStatus = vi.fn();

vi.mock("@/lib/soroban/useSorobanStatus", () => ({
  useSorobanStatus: () => mockStatus(),
}));

const NOW = new Date("2026-01-01T12:00:00Z").getTime();

function setStatus(
  status: "connected" | "disconnected" | "error",
  health: { latencyMs?: number | null; lastEventTimestamp?: number | null } = {},
) {
  mockStatus.mockReturnValue({
    status,
    health: { latencyMs: null, lastEventTimestamp: null, ...health },
  });
}

describe("HealthWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    mockStatus.mockReset();
  });

  it("shows Healthy when connected, fast, and events are fresh", () => {
    setStatus("connected", { latencyMs: 120, lastEventTimestamp: NOW - 5_000 });
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Healthy");
    expect(screen.getByText("Reachable")).toBeInTheDocument();
    expect(screen.getByText("120 ms")).toBeInTheDocument();
    expect(screen.getByText("5s ago")).toBeInTheDocument();
  });

  it("shows Down and Unreachable when disconnected", () => {
    setStatus("disconnected");
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Down");
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("shows Down when the provider reports an error", () => {
    setStatus("error", { latencyMs: 100, lastEventTimestamp: NOW });
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Down");
  });

  it("shows Degraded when latency exceeds the default threshold", () => {
    setStatus("connected", { latencyMs: 2_500, lastEventTimestamp: NOW - 1_000 });
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
    expect(screen.getByText("2.50 s")).toBeInTheDocument();
  });

  it("shows Degraded when no event has been processed", () => {
    setStatus("connected", { latencyMs: 100, lastEventTimestamp: null });
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("shows Degraded when the last event is older than the default stale threshold", () => {
    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW - 31_000 });
    render(<HealthWidget />);

    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
  });

  it("respects staleAfterMs override", () => {
    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW - 10_000 });
    render(<HealthWidget staleAfterMs={5_000} />);

    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
  });

  it("respects slowLatencyMs override", () => {
    setStatus("connected", { latencyMs: 500, lastEventTimestamp: NOW - 1_000 });
    render(<HealthWidget slowLatencyMs={400} />);

    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
  });

  it("formats event age in minutes and hours, and future timestamps as just now", () => {
    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW - 5 * 60_000 });
    const { unmount } = render(<HealthWidget staleAfterMs={Infinity} />);
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    unmount();

    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW - 3 * 3_600_000 });
    const second = render(<HealthWidget staleAfterMs={Infinity} />);
    expect(screen.getByText("3h ago")).toBeInTheDocument();
    second.unmount();

    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW + 10_000 });
    render(<HealthWidget />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("renders an accessible landmark with a heading", () => {
    setStatus("connected", { latencyMs: 100, lastEventTimestamp: NOW });
    render(<HealthWidget />);

    expect(screen.getByRole("region", { name: "Platform health" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Platform Health" })).toBeInTheDocument();
  });
});
