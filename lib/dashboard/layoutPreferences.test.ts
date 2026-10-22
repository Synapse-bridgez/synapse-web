import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_LAYOUT_STORAGE_KEY,
  normalizeLayout,
  getDefaultLayout,
  loadLayout,
  saveLayout,
  resetLayout,
  moveWidget,
  toggleWidgetVisibility,
  type DashboardLayoutPreferences,
  type DashboardWidgetId,
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

// @vitest-environment jsdom

const WIDGET_IDS = DASHBOARD_WIDGETS.map((w) => w.id) as DashboardWidgetId[];

beforeEach(() => {
  localStorage.clear();
});

describe("normalizeLayout", () => {
  it("deduplicates repeated widget IDs, keeping first occurrence", () => {
    const { order } = normalizeLayout({
      order: ["statCards", "statCards", "pipeline"],
      hidden: [],
    });
    const statCardsCount = order.filter((id) => id === "statCards").length;
    expect(statCardsCount).toBe(1);
  });

  it("normalizes a valid hidden list", () => {
    const { hidden } = normalizeLayout({
      order: WIDGET_IDS,
      hidden: ["pipeline"],
    });
    expect(hidden).toEqual(["pipeline"]);
  });

  it("drops unknown IDs from the hidden list", () => {
    const { hidden } = normalizeLayout({
      order: WIDGET_IDS,
      hidden: ["pipeline", "notAWidget"],
    });
    expect(hidden).not.toContain("notAWidget");
    expect(hidden).toContain("pipeline");
  });

  it("deduplicates the hidden list", () => {
    const { hidden } = normalizeLayout({
      order: WIDGET_IDS,
      hidden: ["pipeline", "pipeline"],
    });
    expect(hidden.filter((id) => id === "pipeline")).toHaveLength(1);
  });

  it("handles a non-array order gracefully and still returns all widgets", () => {
    const { order } = normalizeLayout({ order: "bad", hidden: [] });
    expect(order).toEqual(WIDGET_IDS);
  });

  it("handles a non-array hidden gracefully, returning empty hidden", () => {
    const { hidden } = normalizeLayout({ order: WIDGET_IDS, hidden: "bad" });
    expect(hidden).toEqual([]);
  });
});

// ─── #335 loadLayout ──────────────────────────────────────────────────────────

describe("loadLayout", () => {
  it("returns the default layout when localStorage is empty", () => {
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("returns the default layout when the stored value is not valid JSON", () => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "not-json{{{");
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("returns the default layout when the stored value is a JSON primitive", () => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "42");
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("loads and returns a previously saved valid layout", () => {
    const stored: DashboardLayoutPreferences = {
      order: [...WIDGET_IDS].reverse(),
      hidden: ["pipeline"],
    };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(stored));
    const loaded = loadLayout();
    expect(loaded.order).toEqual([...WIDGET_IDS].reverse());
    expect(loaded.hidden).toEqual(["pipeline"]);
  });

  it("normalizes a partial layout loaded from storage", () => {
    const partial = { order: ["statCards"], hidden: [] };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(partial));
    const loaded = loadLayout();
    expect(loaded.order).toHaveLength(4);
    expect(loaded.order[0]).toBe("statCards");
  });

  it("strips unknown widget IDs that were persisted in a stale layout", () => {
    const stale = { order: ["statCards", "legacyWidget", "pipeline"], hidden: [] };
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(stale));
    const loaded = loadLayout();
    expect(loaded.order).not.toContain("legacyWidget");
  });

  it("returns the default layout when the stored value is an empty string", () => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "");
    expect(loadLayout()).toEqual(getDefaultLayout());
  });
});

// ─── #336 saveLayout ──────────────────────────────────────────────────────────

describe("saveLayout", () => {
  it("persists a layout to localStorage under the correct key", () => {
    const layout = getDefaultLayout();
    saveLayout(layout);
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).not.toBeNull();
  });

  it("persists JSON that round-trips back to an equivalent layout", () => {
    const layout: DashboardLayoutPreferences = {
      order: [...WIDGET_IDS].reverse(),
      hidden: ["recentTxTable"],
    };
    saveLayout(layout);
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.order).toEqual([...WIDGET_IDS].reverse());
    expect(parsed.hidden).toContain("recentTxTable");
  });

  it("normalizes the layout before persisting (drops unknown IDs)", () => {
    const layout = {
      order: ["statCards", "unknownWidget", "pipeline", "contractInfoPanel", "recentTxTable"],
      hidden: [],
    } as unknown as DashboardLayoutPreferences;
    saveLayout(layout);
    const stored = JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)!);
    expect(stored.order).not.toContain("unknownWidget");
  });

  it("overwrites any previously saved layout", () => {
    const first = getDefaultLayout();
    saveLayout(first);

    const second: DashboardLayoutPreferences = {
      order: [...WIDGET_IDS].reverse(),
      hidden: ["pipeline"],
    };
    saveLayout(second);

    const stored = JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)!);
    expect(stored.hidden).toContain("pipeline");
  });

  it("can be read back correctly by loadLayout", () => {
    const layout: DashboardLayoutPreferences = {
      order: [...WIDGET_IDS].reverse(),
      hidden: ["contractInfoPanel"],
    };
    saveLayout(layout);
    const loaded = loadLayout();
    expect(loaded.order).toEqual([...WIDGET_IDS].reverse());
    expect(loaded.hidden).toContain("contractInfoPanel");
  });

  it("saves an empty hidden array correctly", () => {
    saveLayout({ order: WIDGET_IDS, hidden: [] });
    const stored = JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)!);
    expect(stored.hidden).toEqual([]);
  });

  it("saves a layout with multiple hidden widgets correctly", () => {
    const layout: DashboardLayoutPreferences = {
      order: WIDGET_IDS,
      hidden: ["pipeline", "recentTxTable"],
    };
    saveLayout(layout);
    const stored = JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)!);
    expect(stored.hidden).toEqual(expect.arrayContaining(["pipeline", "recentTxTable"]));
  });
});

// ─── #337 resetLayout ─────────────────────────────────────────────────────────

describe("resetLayout", () => {
  it("returned hidden list is empty", () => {
    expect(resetLayout().hidden).toEqual([]);
  });

  it("removes the storage key from localStorage", () => {
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    resetLayout();
    expect(removeSpy).toHaveBeenCalledWith(DASHBOARD_LAYOUT_STORAGE_KEY);
  });

  it("does not throw when localStorage.removeItem throws", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("quota exceeded");
    });
    expect(() => resetLayout()).not.toThrow();
  });

  it("returns a fresh object each call (no shared reference)", () => {
    const a = resetLayout();
    const b = resetLayout();
    expect(a).not.toBe(b);
    expect(a.order).not.toBe(b.order);
  });
});

// ---------------------------------------------------------------------------
// #338 — moveWidget
// ---------------------------------------------------------------------------

describe("moveWidget", () => {
  const IDS = DASHBOARD_WIDGETS.map((w) => w.id) as DashboardWidgetId[];

  it("moves a widget forward in the list", () => {
    // [0,1,2,3] → move index 0 to index 2 → [1,2,0,3]
    const result = moveWidget(IDS, 0, 2);
    expect(result[2]).toBe(IDS[0]);
    expect(result[0]).toBe(IDS[1]);
    expect(result[1]).toBe(IDS[2]);
  });

  it("moves a widget backward in the list", () => {
    // [0,1,2,3] → move index 3 to index 1 → [0,3,1,2]
    const result = moveWidget(IDS, 3, 1);
    expect(result[1]).toBe(IDS[3]);
    expect(result[2]).toBe(IDS[1]);
  });

  it("preserves array length", () => {
    const result = moveWidget(IDS, 0, 3);
    expect(result).toHaveLength(IDS.length);
  });

  it("returns the same array reference when fromIndex === toIndex", () => {
    const result = moveWidget(IDS, 1, 1);
    expect(result).toBe(IDS);
  });

  it("returns the same array reference when fromIndex is out of bounds (negative)", () => {
    const result = moveWidget(IDS, -1, 0);
    expect(result).toBe(IDS);
  });

  it("returns the same array reference when fromIndex is out of bounds (too large)", () => {
    const result = moveWidget(IDS, IDS.length, 0);
    expect(result).toBe(IDS);
  });

  it("returns the same array reference when toIndex is out of bounds (negative)", () => {
    const result = moveWidget(IDS, 0, -1);
    expect(result).toBe(IDS);
  });

  it("returns the same array reference when toIndex is out of bounds (too large)", () => {
    const result = moveWidget(IDS, 0, IDS.length);
    expect(result).toBe(IDS);
  });

  it("does not mutate the original array", () => {
    const original = [...IDS];
    moveWidget(IDS, 0, 2);
    expect(IDS).toEqual(original);
  });

  it("returns a new array reference on a valid move", () => {
    const result = moveWidget(IDS, 0, 1);
    expect(result).not.toBe(IDS);
  });

  it("contains all original items after a valid move", () => {
    const result = moveWidget(IDS, 1, 3);
    expect(result.slice().sort()).toEqual([...IDS].sort());
  });
});

// ---------------------------------------------------------------------------
// #339 — toggleWidgetVisibility
// ---------------------------------------------------------------------------

describe("toggleWidgetVisibility", () => {
  it("adds a widget ID when it is not in the hidden list", () => {
    const result = toggleWidgetVisibility([], "statCards");
    expect(result).toContain("statCards");
  });

  it("removes a widget ID when it is already in the hidden list", () => {
    const result = toggleWidgetVisibility(["statCards", "pipeline"], "statCards");
    expect(result).not.toContain("statCards");
  });

  it("preserves other hidden IDs when removing one", () => {
    const result = toggleWidgetVisibility(["statCards", "pipeline"], "statCards");
    expect(result).toContain("pipeline");
  });

  it("preserves other hidden IDs when adding one", () => {
    const result = toggleWidgetVisibility(["pipeline"], "statCards");
    expect(result).toContain("pipeline");
    expect(result).toContain("statCards");
  });

  it("does not mutate the original hidden array", () => {
    const hidden: DashboardWidgetId[] = ["pipeline"];
    const original = [...hidden];
    toggleWidgetVisibility(hidden, "statCards");
    expect(hidden).toEqual(original);
  });

  it("returns a new array reference", () => {
    const hidden: DashboardWidgetId[] = [];
    const result = toggleWidgetVisibility(hidden, "statCards");
    expect(result).not.toBe(hidden);
  });

  it("toggling twice returns the widget to its original visibility state", () => {
    const hidden: DashboardWidgetId[] = [];
    const after1 = toggleWidgetVisibility(hidden, "recentTxTable");
    const after2 = toggleWidgetVisibility(after1, "recentTxTable");
    expect(after2).not.toContain("recentTxTable");
  });

  it("can hide all widgets independently", () => {
    const allIds = DASHBOARD_WIDGETS.map((w) => w.id) as DashboardWidgetId[];
    let hidden: DashboardWidgetId[] = [];
    for (const id of allIds) {
      hidden = toggleWidgetVisibility(hidden, id);
    }
    expect(hidden).toHaveLength(allIds.length);
    for (const id of allIds) {
      expect(hidden).toContain(id);
    }
  });
});
  });
});
