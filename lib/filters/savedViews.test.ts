import { describe, it, expect } from "vitest";
import {
  SAVED_VIEW_FILTER_FIELDS,
  sanitizeFilters,
  migrateSavedViews,
} from "./savedViews";

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

describe("migrateSavedViews", () => {
  it("returns valid views unchanged", () => {
    const views = [{ id: "a", name: "A", filters: { status: "ok" } }];
    expect(migrateSavedViews({ version: 1, views })).toEqual(views);
  });

  it("drops unknown filter fields from views", () => {
    const result = migrateSavedViews({
      version: 0,
      views: [{ id: "a", name: "A", filters: { status: "ok", legacy: "x" } }],
    });
    expect(result).toEqual([{ id: "a", name: "A", filters: { status: "ok" } }]);
  });

  it("defaults missing filters to an empty object", () => {
    expect(migrateSavedViews({ views: [{ id: "a", name: "A" }] })).toEqual([
      { id: "a", name: "A", filters: {} },
    ]);
  });

  it("filters out malformed views", () => {
    const result = migrateSavedViews({
      views: [null, "x", { id: 1, name: "A" }, { id: "a" }, { id: "b", name: "B" }],
    });
    expect(result).toEqual([{ id: "b", name: "B", filters: {} }]);
  });

  it("migrates payloads regardless of version", () => {
    const views = [{ id: "a", name: "A", filters: {} }];
    expect(migrateSavedViews({ version: 999, views })).toEqual(views);
  });

  it("returns an empty array for non-object payloads", () => {
    expect(migrateSavedViews(null)).toEqual([]);
    expect(migrateSavedViews(undefined)).toEqual([]);
    expect(migrateSavedViews("x")).toEqual([]);
    expect(migrateSavedViews(5)).toEqual([]);
  });

  it("returns an empty array when views is not an array", () => {
    expect(migrateSavedViews({ views: "nope" })).toEqual([]);
    expect(migrateSavedViews({})).toEqual([]);
  });
});
