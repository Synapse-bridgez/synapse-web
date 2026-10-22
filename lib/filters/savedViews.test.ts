import { describe, it, expect } from "vitest";
import { SAVED_VIEW_FILTER_FIELDS } from "./savedViews";

describe("SAVED_VIEW_FILTER_FIELDS", () => {
  it("lists the supported filter fields in order", () => {
    expect(SAVED_VIEW_FILTER_FIELDS).toEqual([
      "status",
      "dateFrom",
      "dateTo",
      "search",
    ]);
  });

  it("contains no duplicate entries", () => {
    expect(new Set(SAVED_VIEW_FILTER_FIELDS).size).toBe(
      SAVED_VIEW_FILTER_FIELDS.length,
    );
  });

  it("contains only non-empty strings", () => {
    for (const field of SAVED_VIEW_FILTER_FIELDS) {
      expect(typeof field).toBe("string");
      expect(field.length).toBeGreaterThan(0);
    }
  });

  it("does not include unknown fields", () => {
    expect(SAVED_VIEW_FILTER_FIELDS).not.toContain("legacyField");
  });
});
