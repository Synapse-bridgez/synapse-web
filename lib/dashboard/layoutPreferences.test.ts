import { describe, it, expect } from "vitest";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_LAYOUT_STORAGE_KEY,
} from "./layoutPreferences";

/**
 * Tests for lib/dashboard/layoutPreferences.ts — covers issues #331
 * (DASHBOARD_WIDGETS) and #332 (DASHBOARD_LAYOUT_STORAGE_KEY) so CI catches
 * regressions in either export.
 */

describe("DASHBOARD_LAYOUT_STORAGE_KEY (#332)", () => {
  it("is a non-empty string", () => {
    expect(typeof DASHBOARD_LAYOUT_STORAGE_KEY).toBe("string");
    expect(DASHBOARD_LAYOUT_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it("includes a version suffix so stale data from an old schema is ignored", () => {
    // The key must end with a version marker (e.g. ".v1") so that a schema
    // change can pick a new key and avoid reading incompatible stored data.
    expect(DASHBOARD_LAYOUT_STORAGE_KEY).toMatch(/\.v\d+$/);
  });

  it("has the exact expected value", () => {
    expect(DASHBOARD_LAYOUT_STORAGE_KEY).toBe("dashboard.layoutPreferences.v1");
  });
});

describe("DASHBOARD_WIDGETS (#331)", () => {
  it("is an array", () => {
    expect(Array.isArray(DASHBOARD_WIDGETS)).toBe(true);
  });

  it("is non-empty", () => {
    expect(DASHBOARD_WIDGETS.length).toBeGreaterThan(0);
  });

  it("every entry has an id and a label", () => {
    for (const widget of DASHBOARD_WIDGETS) {
      expect(typeof widget.id).toBe("string");
      expect(widget.id.length).toBeGreaterThan(0);
      expect(typeof widget.label).toBe("string");
      expect(widget.label.length).toBeGreaterThan(0);
    }
  });

  it("contains the four expected widget ids in canonical order", () => {
    const ids = DASHBOARD_WIDGETS.map((w) => w.id);
    expect(ids).toEqual(["statCards", "pipeline", "contractInfoPanel", "recentTxTable"]);
  });

  it("has no duplicate ids", () => {
    const ids = DASHBOARD_WIDGETS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
