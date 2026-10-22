import { describe, it, expect } from "vitest";
import { SAVED_VIEW_FILTER_FIELDS, sanitizeFilters } from "./savedViews";

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

describe("sanitizeFilters", () => {
  it("keeps known string filters", () => {
    const input = { status: "ok", dateFrom: "2024-01-01", dateTo: "2024-02-01", search: "abc" };
    expect(sanitizeFilters(input)).toEqual(input);
  });

  it("drops unknown keys", () => {
    expect(sanitizeFilters({ status: "ok", legacy: "x" })).toEqual({ status: "ok" });
  });

  it("drops known keys with non-string values", () => {
    expect(sanitizeFilters({ status: 1, search: null, dateTo: "d" })).toEqual({ dateTo: "d" });
  });

  it("keeps empty-string values", () => {
    expect(sanitizeFilters({ search: "" })).toEqual({ search: "" });
  });

  it("returns an empty object for null, undefined and primitives", () => {
    expect(sanitizeFilters(null)).toEqual({});
    expect(sanitizeFilters(undefined)).toEqual({});
    expect(sanitizeFilters("status")).toEqual({});
    expect(sanitizeFilters(42)).toEqual({});
  });

  it("does not mutate the input", () => {
    const input = { status: "ok", legacy: "x" };
    sanitizeFilters(input);
    expect(input).toEqual({ status: "ok", legacy: "x" });
  });
});
