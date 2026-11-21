import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAVED_VIEWS_SCHEMA_VERSION,
  SAVED_VIEW_FILTER_FIELDS,
  sanitizeFilters,
  migrateSavedViews,
  getSavedViews,
  storeSavedViews,
  createSavedViewId,
} from "./savedViews";

const KEY = "synapse-transactions-saved-views";

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

describe("SAVED_VIEWS_SCHEMA_VERSION", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(SAVED_VIEWS_SCHEMA_VERSION)).toBe(true);
    expect(SAVED_VIEWS_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("is written into the persisted payload", () => {
    storeSavedViews([{ id: "a", name: "A", filters: { status: "failed" } }]);
    const stored = JSON.parse(localStorage.getItem(KEY) as string);
    expect(stored.version).toBe(SAVED_VIEWS_SCHEMA_VERSION);
    expect(getSavedViews()).toEqual([
      { id: "a", name: "A", filters: { status: "failed" } },
    ]);
  });

  it("drops unknown filter fields and invalid views on migration", () => {
    const result = migrateSavedViews({
      version: 0,
      views: [
        { id: "a", name: "A", filters: { status: "ok", legacy: "x", search: 5 } },
        { id: 1, name: "bad" },
        null,
      ],
    });
    expect(result).toEqual([{ id: "a", name: "A", filters: { status: "ok" } }]);
  });

  it("returns an empty list for malformed payloads", () => {
    expect(migrateSavedViews(null)).toEqual([]);
    expect(migrateSavedViews({ views: "nope" })).toEqual([]);
    localStorage.setItem(KEY, "{not json");
    expect(getSavedViews()).toEqual([]);
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

  it("returns an empty list for malformed payloads", () => {
    expect(migrateSavedViews(null)).toEqual([]);
    expect(migrateSavedViews({ views: "nope" })).toEqual([]);
    localStorage.setItem(KEY, "{not json");
    expect(getSavedViews()).toEqual([]);
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

describe("getSavedViews", () => {
  it("returns stored views", () => {
    const views = [{ id: "a", name: "A", filters: { status: "ok" } }];
    localStorage.setItem(KEY, JSON.stringify({ version: 1, views }));
    expect(getSavedViews()).toEqual(views);
  });

  it("returns an empty array when nothing is stored", () => {
    expect(getSavedViews()).toEqual([]);
  });

  it("returns an empty array for invalid JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(getSavedViews()).toEqual([]);
  });

  it("drops unknown filter fields from stored views", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 0, views: [{ id: "a", name: "A", filters: { old: "x" } }] }),
    );
    expect(getSavedViews()).toEqual([{ id: "a", name: "A", filters: {} }]);
  });

  it("returns an empty array when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getSavedViews()).toEqual([]);
  });

  it("returns an empty array when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(getSavedViews()).toEqual([]);
  });

  it("reads storage only once across multiple renders", () => {
    const views = [{ id: "a", name: "A", filters: { status: "ok" } }];
    localStorage.setItem(KEY, JSON.stringify({ version: 1, views }));
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    expect(getSavedViews()).toEqual(views);
    expect(getSavedViews()).toEqual(views);
    expect(getSavedViews()).toEqual(views);

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it("updates the in-memory copy on write without re-reading storage", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    storeSavedViews([{ id: "a", name: "A", filters: { status: "ok" } }]);
    expect(getSavedViews()).toEqual([
      { id: "a", name: "A", filters: { status: "ok" } },
    ]);

    storeSavedViews([{ id: "b", name: "B", filters: { search: "x" } }]);
    expect(getSavedViews()).toEqual([
      { id: "b", name: "B", filters: { search: "x" } },
    ]);

    expect(getItem).not.toHaveBeenCalled();
  });
});

describe("storeSavedViews", () => {
  it("persists views with the schema version", () => {
    storeSavedViews([{ id: "a", name: "A", filters: { status: "PENDING" } }]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      version: 1,
      views: [{ id: "a", name: "A", filters: { status: "PENDING" } }],
    });
  });

  it("drops unknown filter fields", () => {
    storeSavedViews([
      { id: "a", name: "A", filters: { search: "x", bogus: "y" } as never },
    ]);
    expect(JSON.parse(localStorage.getItem(KEY)!).views[0].filters).toEqual({ search: "x" });
  });

  it("stores an empty list", () => {
    storeSavedViews([]);
    expect(JSON.parse(localStorage.getItem(KEY)!).views).toEqual([]);
  });

  it("round-trips through getSavedViews", () => {
    const views = [{ id: "a", name: "A", filters: { dateFrom: "2026-01-01" } }];
    storeSavedViews(views);
    expect(getSavedViews()).toEqual(views);
  });

  it("generates unique ids", () => {
    const a = createSavedViewId();
    const b = createSavedViewId();
    expect(a).not.toBe(b);
    expect(typeof a).toBe("string");
  });
});
