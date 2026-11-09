import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageDurationChart } from "./StageDurationChart";
import { STATUS_META, DIM } from "@/lib/constants";
import type { StageDuration } from "@/lib/analytics/rollup";

describe("StageDurationChart (#295)", () => {
  const sampleDurations: StageDuration[] = [
    { status: "PENDING", avgMs: 450, samples: 10 },
    { status: "PROCESSING", avgMs: 12500, samples: 1 },
    { status: "COMPLETED", avgMs: 150000, samples: 25 },
    { status: "FAILED", avgMs: 0, samples: 0 },
  ];

  it("renders status labels and formatted duration metrics", () => {
    render(<StageDurationChart durations={sampleDurations} />);

    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("450ms · 10 samples")).toBeInTheDocument();

    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
    expect(screen.getByText("12.5s · 1 sample")).toBeInTheDocument();

    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("2.5m · 25 samples")).toBeInTheDocument();

    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders accessible meter element with proper ARIA attributes", () => {
    render(<StageDurationChart durations={sampleDurations} />);

    const completedMeter = screen.getByRole("meter", { name: "COMPLETED avg duration: 2.5m" });
    expect(completedMeter).toBeInTheDocument();
    expect(completedMeter).toHaveAttribute("aria-valuenow", "150000");
    expect(completedMeter).toHaveAttribute("aria-valuemin", "0");
    expect(completedMeter).toHaveAttribute("aria-valuemax", "150000");

    const pendingMeter = screen.getByRole("meter", { name: "PENDING avg duration: 450ms" });
    expect(pendingMeter).toBeInTheDocument();
    expect(pendingMeter).toHaveAttribute("aria-valuenow", "450");
  });

  it("calculates inner progress bar width relative to maximum duration", () => {
    const durations: StageDuration[] = [
      { status: "PENDING", avgMs: 50, samples: 5 },
      { status: "COMPLETED", avgMs: 100, samples: 10 },
    ];
    render(<StageDurationChart durations={durations} />);
    const meters = screen.getAllByRole("meter");

    const pendingBar = meters[0].firstElementChild as HTMLElement;
    expect(pendingBar.style.width).toBe("50%");

    const completedBar = meters[1].firstElementChild as HTMLElement;
    expect(completedBar.style.width).toBe("100%");
  });

  it("applies theme status color from STATUS_META", () => {
    render(<StageDurationChart durations={sampleDurations} />);

    const completedText = screen.getByText("COMPLETED");
    expect(completedText.style.color).toBe(STATUS_META.COMPLETED.color);

    const pendingText = screen.getByText("PENDING");
    expect(pendingText.style.color).toBe(STATUS_META.PENDING.color);
  });

  it("handles empty durations list gracefully without throwing", () => {
    const { container } = render(<StageDurationChart durations={[]} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
  });

  it("falls back gracefully when given an unrecognized status", () => {
    const unknownDuration: StageDuration = {
      status: "CUSTOM_STAGE" as any,
      avgMs: 3000,
      samples: 2,
    };
    render(<StageDurationChart durations={[unknownDuration]} />);

    const label = screen.getByText("CUSTOM_STAGE");
    expect(label).toBeInTheDocument();
    expect(label.style.color).toBe(DIM);

    const meter = screen.getByRole("meter", { name: "CUSTOM_STAGE avg duration: 3.0s" });
    const bar = meter.firstElementChild as HTMLElement;
    expect(bar.style.background).toBe(DIM);
    expect(bar.style.width).toBe("100%");
  });
});
