export type TrendingChipId = 'rooftops' | 'restaurants' | 'exhibitions' | 'bars';

export type TrendingChip = {
  id: TrendingChipId;
  labelKey: `search.trending.${TrendingChipId}`;
};

/**
 * "Tendances" chips (Sprint 6 brief §4) — static config, not a repository, same "fixed set" precedent
 * as `discoverTabs.ts`/`suggestionMoods.ts`. Each label doubles as the query text submitted when
 * tapped: chosen so every one actually surfaces a mock experience (title/description/category text
 * match, see `services/mock/search.ts`), not just decorative labels.
 */
export const TRENDING_CHIPS: readonly TrendingChip[] = [
  { id: 'rooftops', labelKey: 'search.trending.rooftops' },
  { id: 'restaurants', labelKey: 'search.trending.restaurants' },
  { id: 'exhibitions', labelKey: 'search.trending.exhibitions' },
  { id: 'bars', labelKey: 'search.trending.bars' },
];
