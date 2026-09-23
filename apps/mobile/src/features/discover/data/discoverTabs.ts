/**
 * Discover's secondary navigation (sprint 6 brief §"Navigation secondaire"): a fixed set of tabs, not
 * fetched content — same "static config, no repository needed" precedent as Home's `HOME_MOODS`/
 * `NEARBY_CATEGORIES`. Each tab narrows which sections of the page are shown (`DiscoverScreen`'s
 * `TAB_SECTIONS`); "Pour toi" is the default, full editorial mix.
 */
export type DiscoverTabId = 'forYou' | 'trends' | 'nearby' | 'collections';

export type DiscoverTab = {
  id: DiscoverTabId;
  labelKey: `discover.tabs.${DiscoverTabId}`;
};

export const DISCOVER_TABS: readonly DiscoverTab[] = [
  { id: 'forYou', labelKey: 'discover.tabs.forYou' },
  { id: 'trends', labelKey: 'discover.tabs.trends' },
  { id: 'nearby', labelKey: 'discover.tabs.nearby' },
  { id: 'collections', labelKey: 'discover.tabs.collections' },
];
