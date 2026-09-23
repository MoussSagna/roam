import { useCallback, useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Experience, SearchFilters, SearchSuggestion } from '@/types';

/** Waits for a pause in typing before asking for suggestions — a mocked repository resolves
 * instantly, but a screen wired for a real query engine later should not fire on every keystroke. */
const SUGGESTION_DEBOUNCE_MS = 250;

type SearchState = {
  suggestions: SearchSuggestion[];
  results: Experience[];
  isLoading: boolean;
};

const INITIAL_STATE: SearchState = { suggestions: [], results: [], isLoading: false };

/**
 * Owns Search's query/filter/result state (`Screen -> hook -> Repository`, same shape as
 * `useDiscoverData`). Two phases: **typing** (debounced `suggest()`, `hasSubmitted` is false) and
 * **submitted** (`search()`, re-run whenever `filters` changes afterwards — e.g. from the filter
 * sheet's "Voir X résultats"). `isLoading` flips to `true` from the event handlers that trigger a new
 * search (`submit`/`setFilters` below), not from inside the effect itself — only the effect's async
 * `.then()` callbacks call `setState` (`react-hooks/set-state-in-effect`, same discipline as
 * `useDiscoverData`/`useHomeExperiences`).
 */
export function useSearch() {
  const [queryText, setQueryText] = useState('');
  const [filters, setFiltersState] = useState<SearchFilters>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [state, setState] = useState<SearchState>(INITIAL_STATE);

  useEffect(() => {
    if (hasSubmitted || !queryText.trim()) {
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      repositories.search.suggest(queryText).then((suggestions) => {
        if (active) {
          setState((current) => ({ ...current, suggestions }));
        }
      });
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [queryText, hasSubmitted]);

  useEffect(() => {
    if (!hasSubmitted) return;

    let active = true;
    repositories.search.search(queryText, filters).then((results) => {
      if (active) {
        setState({ suggestions: [], results, isLoading: false });
      }
    });

    return () => {
      active = false;
    };
  }, [hasSubmitted, queryText, filters]);

  /** Submits the current (or an explicit, e.g. a tapped chip's) query text and switches to results. */
  const submit = useCallback((text?: string) => {
    if (text !== undefined) {
      setQueryText(text);
    }
    setHasSubmitted(true);
    setState((current) => ({ ...current, isLoading: true }));
  }, []);

  const setFilters = useCallback((next: SearchFilters) => {
    setFiltersState(next);
    setState((current) => ({ ...current, isLoading: true }));
  }, []);

  const reset = useCallback(() => {
    setQueryText('');
    setFiltersState({});
    setHasSubmitted(false);
    setState(INITIAL_STATE);
  }, []);

  return {
    queryText,
    setQueryText,
    filters,
    setFilters,
    suggestions: hasSubmitted || !queryText.trim() ? [] : state.suggestions,
    results: state.results,
    isLoading: state.isLoading,
    hasSubmitted,
    submit,
    reset,
  };
}
