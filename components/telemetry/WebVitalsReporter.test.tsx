import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useReportWebVitals } from "next/web-vitals";
import { sendWebVitalsMetric } from "@/lib/telemetry/webVitals";
import { WebVitalsReporter } from "./WebVitalsReporter";

vi.mock("next/web-vitals", () => ({
  useReportWebVitals: vi.fn(),
}));

vi.mock("@/lib/telemetry/webVitals", () => ({
  sendWebVitalsMetric: vi.fn(),
}));

const mockUseReportWebVitals = vi.mocked(useReportWebVitals);
const mockSend = vi.mocked(sendWebVitalsMetric);

type ReportCallback = Parameters<typeof useReportWebVitals>[0];

function lastRegisteredCallback(): ReportCallback {
  const calls = mockUseReportWebVitals.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0];
}

describe("WebVitalsReporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing into the DOM", () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
  });

  it("registers a web-vitals listener on mount", () => {
    render(<WebVitalsReporter />);
    expect(mockUseReportWebVitals).toHaveBeenCalledTimes(1);
    expect(typeof lastRegisteredCallback()).toBe("function");
  });

  it("does not send any metric until one is reported", () => {
    render(<WebVitalsReporter />);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("forwards each reported metric to sendWebVitalsMetric unchanged", () => {
    render(<WebVitalsReporter />);
    const report = lastRegisteredCallback();

    const lcp = { id: "v1-lcp", name: "LCP", value: 1234.5, rating: "good" } as const;
    const cls = { id: "v1-cls", name: "CLS", value: 0.3, rating: "poor" } as const;

    report(lcp as unknown as Parameters<ReportCallback>[0]);
    report(cls as unknown as Parameters<ReportCallback>[0]);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenNthCalledWith(1, lcp);
    expect(mockSend).toHaveBeenNthCalledWith(2, cls);
  });

  it("keeps reporting after a re-render", () => {
    const { rerender } = render(<WebVitalsReporter />);
    rerender(<WebVitalsReporter />);

    const report = lastRegisteredCallback();
    const ttfb = { id: "v1-ttfb", name: "TTFB", value: 90 };
    report(ttfb as unknown as Parameters<ReportCallback>[0]);

    expect(mockSend).toHaveBeenCalledWith(ttfb);
  });
});
