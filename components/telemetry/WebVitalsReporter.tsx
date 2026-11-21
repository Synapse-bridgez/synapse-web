"use client";

import { useEffect } from "react";

/**
 * Cached promise for the lazily-loaded telemetry module.
 *
 * The telemetry entry pulls in alert rules and transport code that are not
 * needed for first paint. Importing it statically would ship all of that in the
 * initial bundle for every page, so we defer it until the first metric is
 * reported and reuse the same promise for every subsequent report.
 */
let telemetryModulePromise: Promise<typeof import("@/lib/telemetry")> | null = null;

function loadTelemetry(): Promise<typeof import("@/lib/telemetry")> {
  if (!telemetryModulePromise) {
    telemetryModulePromise = import("@/lib/telemetry");
  }
  return telemetryModulePromise;
}

interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
}

/**
 * Reports Core Web Vitals to the telemetry module.
 *
 * The telemetry module is loaded lazily on the first metric so alert rules and
 * transport stay out of the initial chunk. Metrics are still recorded once the
 * dynamic import resolves.
 */
export function WebVitalsReporter(): null {
  useEffect(() => {
    let cancelled = false;

    const report = (metric: WebVitalsMetric) => {
      void loadTelemetry()
        .then((telemetry) => {
          if (cancelled) return;
          telemetry.recordWebVital?.(metric.name, metric.value, metric.id);
        })
        .catch(() => {
          // Telemetry is best-effort; never let a failed load break the page.
        });
    };

    const handleMetric = (event: Event) => {
      const detail = (event as CustomEvent<WebVitalsMetric>).detail;
      if (detail) report(detail);
    };

    window.addEventListener("web-vitals", handleMetric as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("web-vitals", handleMetric as EventListener);
    };
  }, []);

  return null;
}

export default WebVitalsReporter;
