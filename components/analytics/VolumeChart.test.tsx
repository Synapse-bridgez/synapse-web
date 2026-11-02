import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VolumeChart } from "./VolumeChart";
import { AMBER, BG3 } from "@/lib/constants";
import type { VolumeBucket } from "@/lib/analytics/rollup";

describe("VolumeChart (#297)", () => {
  const sampleBuckets: VolumeBucket[] = [
    { label: "10:00", count: 0 },
    { label: "10:05", count: 12 },
    { label: "10:10", count: 24 },
    { label: "10:15", count: 6 },
    { label: "10:20", count: 0 },
  ];

  it("renders container with correct accessible role and label", () => {
    render(<VolumeChart buckets={sampleBuckets} />);
    const chart = screen.getByRole("img", { name: "Transaction volume bar chart" });
    expect(chart).toBeInTheDocument();
  });

  it("renders correct number of bar elements matching buckets length", () => {
    const { container } = render(<VolumeChart buckets={sampleBuckets} />);
    const chart = screen.getByRole("img", { name: "Transaction volume bar chart" });
    const bars = chart.children;
    expect(bars.length).toBe(sampleBuckets.length);
  });

  it("assigns accurate tooltip titles to each bar element", () => {
    render(<VolumeChart buckets={sampleBuckets} />);
    expect(screen.getByTitle("10:00: 0 tx")).toBeInTheDocument();
    expect(screen.getByTitle("10:05: 12 tx")).toBeInTheDocument();
    expect(screen.getByTitle("10:10: 24 tx")).toBeInTheDocument();
    expect(screen.getByTitle("10:15: 6 tx")).toBeInTheDocument();
    expect(screen.getByTitle("10:20: 0 tx")).toBeInTheDocument();
  });

  it("renders first and last bucket labels on the bottom axis", () => {
    render(<VolumeChart buckets={sampleBuckets} />);
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("10:20")).toBeInTheDocument();
  });

  it("handles empty buckets array gracefully without crashing", () => {
    render(<VolumeChart buckets={[]} />);
    const chart = screen.getByRole("img", { name: "Transaction volume bar chart" });
    expect(chart.children.length).toBe(0);
  });

  it("styles zero-count bars with background BG3 and 1% height", () => {
    render(<VolumeChart buckets={[{ label: "09:00", count: 0 }]} />);
    const zeroBar = screen.getByTitle("09:00: 0 tx");
    expect(zeroBar.style.height).toBe("1%");
    expect(zeroBar.style.background).toBe(BG3);
    expect(zeroBar.style.opacity).toBe("0.3");
  });

  it("styles positive-count bars with AMBER background and calculates proportional height", () => {
    const buckets: VolumeBucket[] = [
      { label: "12:00", count: 50 },
      { label: "12:05", count: 100 },
    ];
    render(<VolumeChart buckets={buckets} />);

    const bar50 = screen.getByTitle("12:00: 50 tx");
    const bar100 = screen.getByTitle("12:05: 100 tx");

    expect(bar100.style.height).toBe("100%");
    expect(bar100.style.background).toBe(AMBER);
    expect(bar100.style.opacity).toBe("0.85");

    expect(bar50.style.height).toBe("50%");
    expect(bar50.style.background).toBe(AMBER);
  });

  it("enforces minimum 6% height on non-zero buckets with small volume", () => {
    const buckets: VolumeBucket[] = [
      { label: "14:00", count: 1 },
      { label: "14:05", count: 1000 },
    ];
    render(<VolumeChart buckets={buckets} />);
    const smallBar = screen.getByTitle("14:00: 1 tx");
    // 1/1000 * 100 = 0.1%, so Math.max(0.1, 6) = 6%
    expect(smallBar.style.height).toBe("6%");
    expect(smallBar.style.background).toBe(AMBER);
  });

  it("handles a single bucket appropriately", () => {
    render(<VolumeChart buckets={[{ label: "Single", count: 10 }]} />);
    const bar = screen.getByTitle("Single: 10 tx");
    expect(bar.style.height).toBe("100%");
    expect(screen.getAllByText("Single").length).toBe(2);
  });

  it("handles all-zero buckets without division by zero", () => {
    const zeroBuckets: VolumeBucket[] = [
      { label: "A", count: 0 },
      { label: "B", count: 0 },
    ];
    render(<VolumeChart buckets={zeroBuckets} />);
    const barA = screen.getByTitle("A: 0 tx");
    const barB = screen.getByTitle("B: 0 tx");
    expect(barA.style.height).toBe("1%");
    expect(barB.style.height).toBe("1%");
  });
});
