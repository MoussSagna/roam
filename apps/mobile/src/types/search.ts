import type { BudgetRange } from './common';
import type { Experience } from './experience';

/** Narrows candidates before text matching (`07_DATA_AND_RECOMMENDATION.md` "Candidate filtering") —
 * eliminate impossible options first, then let the query text narrow what's left. */
export type SearchFilters = {
  categoryId?: string;
  maxDistanceKm?: number;
  budget?: BudgetRange;
  when?: 'now' | 'today' | 'weekend';
  openNow?: boolean;
  walkable?: boolean;
};

/** Client-side result ordering (sprint 8 §4): entirely local/mocked, applied to whatever the
 * repository already returned — no backend sort. `recommended` is the repository's own order
 * (unchanged). */
export type SearchSortOption = 'recommended' | 'nearest' | 'topRated' | 'priceAsc' | 'priceDesc';

export type SearchSuggestion = {
  id: string;
  label: string;
  type: 'query' | 'experience';
  /** Set when `type === 'experience'`: lets a suggestion row jump straight to Experience Detail. */
  experienceId?: string;
};

/** A past search the user can relaunch or remove (Sprint 6 brief §13). Local/mocked persistence only,
 * no backend — see `useRecentSearches`. `id` is the trimmed query text itself (recent searches are
 * already deduped by it, so a separate id would only ever mirror it). */
export type RecentSearch = {
  id: string;
  query: string;
  /** ISO timestamp, kept for a possible future "il y a 2 jours" display — not rendered today. */
  searchedAt: string;
};

/** A search result is just an `Experience` — no shadow type (Sprint 6 brief §14: "réutiliser les
 * types existants"). Kept as an alias so search-specific code reads intentionally. */
export type SearchResult = Experience;
