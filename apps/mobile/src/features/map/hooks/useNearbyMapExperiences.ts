import { useCallback, useMemo, useState } from 'react';

import { pickNearby } from '@/features/discover/lib/pickNearby';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';
import type { Experience } from '@/types';

import type { MapMarkerData } from '../types/map.types';

/** An experience that can actually be pinned: `coordinates` is optional on the domain type. */
function isPinnable(
  experience: Experience,
): experience is Experience & { coordinates: NonNullable<Experience['coordinates']> } {
  return experience.coordinates !== undefined;
}

/**
 * Data + selection for the standalone Map screen: the same "Près de toi" pool as Discover
 * (`pickNearby`), narrowed to what has coordinates, exposed as vendor-agnostic markers.
 * `Screen -> this hook -> ExperienceRepository (mock) -> RoamMap` (D-70).
 */
export function useNearbyMapExperiences() {
  const { experiences, isLoading } = useHomeExperiences();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapExperiences = useMemo(() => pickNearby(experiences).filter(isPinnable), [experiences]);
  const markers = useMemo<MapMarkerData[]>(
    () =>
      mapExperiences.map((experience) => ({
        id: experience.id,
        title: experience.title,
        coordinate: experience.coordinates,
      })),
    [mapExperiences],
  );
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
