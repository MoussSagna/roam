import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Experience, RecentSearch, SearchFilters, SearchSortOption } from '@/types';

import { sortResults } from './lib/sortResults';
import { useRecentSearches } from './useRecentSearches';
import { useSearch } from './useSearch';

type SearchSession = {
  queryText: string;
  setQueryText: (text: string) => void;
  filters: SearchFilters;
  suggestions: ReturnType<typeof useSearch>['suggestions'];
  /** What the repository returned for the current query + filters (unsorted). */
  results: Experience[];
  /** `results` after `sort` — the single list both `SearchScreen` and `SearchMapScreen` render. */
  sortedResults: Experience[];
  isLoading: boolean;
  hasSubmitted: boolean;
  sort: SearchSortOption;
  setSort: (sort: SearchSortOption) => void;
  /** Selected pin of the map screen; kept here so it survives a trip back to the list. */
  selectedMapId: string | null;
  setSelectedMapId: (id: string | null) => void;
  recentSearches: RecentSearch[];
  removeRecentSearch: (id: string) => void;
  /** Submits a query (trimmed, ignored when empty) and remembers it as a recent search. */
  runSearch: (text: string) => void;
  /** Commits new filters; also submits the current text when nothing was submitted yet. */
  applyFilters: (filters: SearchFilters) => void;
  reset: () => void;
};

const SearchSessionContext = createContext<SearchSession | null>(null);

/**
 * The one Search state (`docs/DECISIONS.md` D-72): query, filters, results, sort, recents and the
 * selected map pin. It sits above **both** `/search` (list) and `/search/map` (`SearchMapScreen`) —
 * mounted by the nested `search/_layout` — so going to the map and back neither restarts the search
 * nor forks a second copy of it. Leaving `/search` altogether unmounts it, so the next visit starts
 * fresh, exactly as before. `useSearch` still owns the repository calls; nothing here re-implements
 * searching, filtering or sorting.
 */
export function SearchSessionProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const { recentSearches, addRecentSearch, removeRecentSearch } = useRecentSearches();
  const [sort, setSort] = useState<SearchSortOption>('recommended');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const { queryText, submit, setFilters, hasSubmitted, results, reset: resetSearch } = search;

  const sortedResults = useMemo(() => sortResults(results, sort), [results, sort]);

  const runSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      submit(trimmed);
      addRecentSearch(trimmed);
    },
    [submit, addRecentSearch],
  );

  const applyFilters = useCallback(
    (nextFilters: SearchFilters) => {
      setFilters(nextFilters);
      if (!hasSubmitted) {
        submit(queryText);
      }
    },
    [setFilters, hasSubmitted, submit, queryText],
  );

  const reset = useCallback(() => {
    resetSearch();
    setSelectedMapId(null);
  }, [resetSearch]);

  const value: SearchSession = {
    queryText,
    setQueryText: search.setQueryText,
    filters: search.filters,
    suggestions: search.suggestions,
    results,
    sortedResults,
    isLoading: search.isLoading,
    hasSubmitted,
    sort,
    setSort,
    selectedMapId,
    setSelectedMapId,
    recentSearches,
    removeRecentSearch,
    runSearch,
    applyFilters,
    reset,
  };

  return <SearchSessionContext.Provider value={value}>{children}</SearchSessionContext.Provider>;
}

export function useSearchSession(): SearchSession {
  const session = useContext(SearchSessionContext);
  if (!session) {
    throw new Error('useSearchSession must be used within a SearchSessionProvider');
  }
  return session;
}
