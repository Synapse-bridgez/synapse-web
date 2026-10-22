import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSavedViewId, getSavedViews, storeSavedViews } from "./savedViews";

const KEY = "synapse-transactions-saved-views";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

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

  it("swallows storage errors", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => storeSavedViews([{ id: "a", name: "A", filters: {} }])).not.toThrow();
  });

  it("is a no-op without window", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(() => storeSavedViews([{ id: "a", name: "A", filters: {} }])).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("createSavedViewId", () => {
  it("has the view-<time>-<random> format", () => {
    expect(createSavedViewId()).toMatch(/^view-[a-z0-9]+-[a-z0-9]{1,6}$/);
  });

  it("uses the current time", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    expect(createSavedViewId().split("-")[1]).toBe((1_000_000).toString(36));
  });

  it("produces distinct ids", () => {
    const ids = new Set(Array.from({ length: 50 }, createSavedViewId));
    expect(ids.size).toBe(50);
  });
});
