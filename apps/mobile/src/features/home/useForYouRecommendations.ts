import { useCallback, useEffect, useState } from 'react';

import { getLocationPermission, requestCurrentLocation } from '@/hooks/useCurrentLocation';
import { repositories } from '@/services';
import type { Coordinates, Experience, Mood } from '@/types';

/** The size of "Des idées pour toi" (what `pickForYou` returned before API-12). */
export const FOR_YOU_LIMIT = 4;

/**
 * The user's position when the permission is already granted. Home never prompts: asking belongs to the screens
 * that explain why (onboarding, journey start). Without it, recommendations come without distance.
 */
async function knownLocation(): Promise<Coordinates | undefined> {
  if ((await getLocationPermission()) !== 'granted') return undefined;
  const result = await requestCurrentLocation();
  return result.status === 'located' ? result.coordinates : undefined;
}

/**
 * "Des idées pour toi" (`Screen -> hook -> RecommendationRepository`): the context Home really has — the position
 * if already allowed, the selected mood (used by the mock only), the section size. Budget, company and distance
 * are not known on Home: the API takes them from the saved preferences.
 *
 * One request per context: it waits for the position to be read, then asks again only when the mood or the
 * position changes, or on `retry`. The previous items stay shown while a new context loads. A failure is an
 * error — never mock data.
 */
export function useForYouRecommendations(mood: Mood) {
  /** `null`: not read yet. */
  const [location, setLocation] = useState<Coordinates | undefined | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void knownLocation().then((coordinates) => {
      if (active) setLocation(coordinates);
    });
    return () => {
      active = false;
    };
  }, []);

  const locationRead = location !== null;
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (!locationRead) return;
    let active = true;
    repositories.recommendations
      .recommend({
        location:
          latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined,
        mood,
        limit: FOR_YOU_LIMIT,
      })
      .then((result) => {
        if (!active) return;
        setExperiences(result.items.map((item) => item.experience));
        setError(null);
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locationRead, latitude, longitude, mood, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  return { experiences, isLoading, error, retry };
}
