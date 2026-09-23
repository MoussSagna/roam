import { useCallback, useMemo, useState } from 'react';

import { pickNearby } from '@/features/discover/lib/pickNearby';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';

import { isPinnable, toMapMarkers } from '../lib/markers';

/**
 * Data + selection for the standalone Map screen: the same "Près de toi" pool as Discover
 * (`pickNearby`), narrowed to what has coordinates, exposed as vendor-agnostic markers.
 * `Screen -> this hook -> ExperienceRepository (mock) -> RoamMap` (D-70).
 */
export function useNearbyMapExperiences() {
  const { experiences, isLoading } = useHomeExperiences();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapExperiences = useMemo(() => pickNearby(experiences).filter(isPinnable), [experiences]);
  const markers = useMemo(() => toMapMarkers(mapExperiences), [mapExperiences]);
  const selectedExperience =
    mapExperiences.find((experience) => experience.id === selectedId) ?? null;

  /** Tapping the selected marker again clears the selection, like the illustrated map did. */
  const toggleSelected = useCallback(
    (id: string) => setSelectedId((current) => (current === id ? null : id)),
    [],
  );
  const clearSelection = useCallback(() => setSelectedId(null), []);

  return { isLoading, markers, selectedExperience, toggleSelected, clearSelection };
}
