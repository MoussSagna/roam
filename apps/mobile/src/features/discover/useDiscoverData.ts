import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Collection, Experience } from '@/types';

type DiscoverDataState = {
  experiences: Experience[];
  collections: Collection[];
  isLoading: boolean;
  isError: boolean;
};

const INITIAL_STATE: DiscoverDataState = {
  experiences: [],
  collections: [],
  isLoading: true,
  isError: false,
};

/**
 * Loads Discover's two mock pools together (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`).
 * Unlike `useHomeExperiences`, this also tracks a real error state (`03_UX_SCREENS_AND_FLOWS.md` ->
 * "Important states" -> "network error"): the mock repositories never reject today, but the screen
 * stays ready for a real API implementation that can.
 */
export function useDiscoverData(): DiscoverDataState {
  const [state, setState] = useState<DiscoverDataState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    Promise.all([repositories.experiences.list(), repositories.collections.list()])
      .then(([experiences, collections]) => {
        if (active) {
          setState({ experiences, collections, isLoading: false, isError: false });
        }
      })
      .catch(() => {
        if (active) {
          setState((current) => ({ ...current, isLoading: false, isError: true }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
