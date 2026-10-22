import { describe, it, expect, beforeEach } from "vitest";
import {
  SAVED_VIEWS_SCHEMA_VERSION,
  getSavedViews,
  migrateSavedViews,
  storeSavedViews,
} from "./savedViews";

const KEY = "synapse-transactions-saved-views";

beforeEach(() => {
  localStorage.clear();
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
