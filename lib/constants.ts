import { TABS, type TabId } from "./tabs";

export { TABS };
export type { TabId };

export const TAB_IDS: TabId[] = TABS.map((tab) => tab.id);

export const DEFAULT_TAB: TabId = TABS[0]?.id ?? "home";

export function isTabId(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}
