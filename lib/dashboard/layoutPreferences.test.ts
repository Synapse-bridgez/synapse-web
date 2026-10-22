// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resetLayout,
  moveWidget,
  toggleWidgetVisibility,
  getDefaultLayout,
  DASHBOARD_WIDGETS,
  DASHBOARD_LAYOUT_STORAGE_KEY,
} from "./layoutPreferences";
import type { DashboardWidgetId } from "./layoutPreferences";

// ---------------------------------------------------------------------------
// #337 — resetLayout
// ---------------------------------------------------------------------------

describe("resetLayout", () => {
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    removeSpy = vi.spyOn(Storage.prototype, "removeItem");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the default layout", () => {
    const result = resetLayout();
    const defaults = getDefaultLayout();
    expect(result).toEqual(defaults);
  });

  it("returned order contains every widget ID exactly once", () => {
    const { order } = resetLayout();
    const allIds = DASHBOARD_WIDGETS.map((w) => w.id);
    expect(order).toHaveLength(allIds.length);
    expect(new Set(order).size).toBe(allIds.length);
    for (const id of allIds) {
      expect(order).toContain(id);
    }
  });

  it("returned hidden list is empty", () => {
    expect(resetLayout().hidden).toEqual([]);
  });

  it("removes the storage key from localStorage", () => {
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
