import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusRatioChart } from "./StatusRatioChart";
import { STATUS_META, DIM } from "@/lib/constants";
import type { StatusRatio } from "@/lib/analytics/rollup";

describe("StatusRatioChart (#296)", () => {
  const sampleRatios: StatusRatio[] = [
    { status: "COMPLETED", count: 80, pct: 80.0 },
    { status: "FAILED", count: 15, pct: 15.0 },
    { status: "PENDING", count: 5, pct: 5.0 },
  ];

  it("renders status labels and formatted percentage details", () => {
    render(<StatusRatioChart ratios={sampleRatios} />);

    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("80 · 80.0%")).toBeInTheDocument();

    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.getByText("15 · 15.0%")).toBeInTheDocument();

    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("5 · 5.0%")).toBeInTheDocument();
  });

  it("renders accessible meter element with proper ARIA attributes", () => {
    render(<StatusRatioChart ratios={sampleRatios} />);

    const completedMeter = screen.getByRole("meter", { name: "COMPLETED: 80.0%" });
    expect(completedMeter).toBeInTheDocument();
    expect(completedMeter).toHaveAttribute("aria-valuenow", "80");
    expect(completedMeter).toHaveAttribute("aria-valuemin", "0");
    expect(completedMeter).toHaveAttribute("aria-valuemax", "100");

    const failedMeter = screen.getByRole("meter", { name: "FAILED: 15.0%" });
    expect(failedMeter).toBeInTheDocument();
    expect(failedMeter).toHaveAttribute("aria-valuenow", "15");
  });

  it("sets dynamic width on the inner progress bar according to pct", () => {
    const { container } = render(<StatusRatioChart ratios={sampleRatios} />);
    const meters = screen.getAllByRole("meter");

    const completedBar = meters[0].firstElementChild as HTMLElement;
    expect(completedBar.style.width).toBe("80%");

    const failedBar = meters[1].firstElementChild as HTMLElement;
    expect(failedBar.style.width).toBe("15%");

    const pendingBar = meters[2].firstElementChild as HTMLElement;
    expect(pendingBar.style.width).toBe("5%");
  });

  it("applies theme status color from STATUS_META", () => {
    render(<StatusRatioChart ratios={sampleRatios} />);

    const completedText = screen.getByText("COMPLETED");
    expect(completedText.style.color).toBe(STATUS_META.COMPLETED.color);

    const failedText = screen.getByText("FAILED");
    expect(failedText.style.color).toBe(STATUS_META.FAILED.color);
  });

  it("handles empty ratios list without throwing", () => {
    const { container } = render(<StatusRatioChart ratios={[]} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
  });

  it("falls back gracefully when given an unrecognized status", () => {
    const unknownRatio: StatusRatio = {
      status: "CUSTOM_STATE" as any,
      count: 10,
      pct: 50.0,
    };
    render(<StatusRatioChart ratios={[unknownRatio]} />);

    const label = screen.getByText("CUSTOM_STATE");
    expect(label).toBeInTheDocument();
    expect(label.style.color).toBe(DIM);

    const meter = screen.getByRole("meter", { name: "CUSTOM_STATE: 50.0%" });
    const bar = meter.firstElementChild as HTMLElement;
    expect(bar.style.background).toBe(DIM);
    expect(bar.style.width).toBe("50%");
  });
});
