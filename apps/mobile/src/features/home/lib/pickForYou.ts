import type { Experience, Mood } from '@/types';

/** Category preferred when nothing else determines the "matches your interests" pick. */
const PREFERRED_CATEGORY_ID = 'cat-culture';

/** Parses the leading number of a mock distance label ("900 m", "1,2 km") for a rough sort. Exported
 * for Discover's own "Près de toi" sort (`features/discover/lib/pickNearby.ts`) — reused rather than
 * duplicated. */
export function parseDistanceMeters(distanceLabel: string | undefined): number {
  if (!distanceLabel) return Number.POSITIVE_INFINITY;
  const value = parseFloat(distanceLabel.replace(',', '.'));
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return distanceLabel.includes('km') ? value * 1000 : value;
}

/**
 * Deterministic, explainable "Des idées pour toi" pool (`07_DATA_AND_RECOMMENDATION.md`: start
 * deterministic, no ML). Four simple, distinct rules — no scoring model, no persisted preferences yet:
 *
 * 1. matches the currently selected mood;
 * 2. matches a preferred category (`PREFERRED_CATEGORY_ID`, stands in for saved preferences);
 * 3. the most popular experience;
 * 4. the nearest one.
 *
 * Each rule skips an experience already picked by an earlier rule, and the pool is topped up with any
 * remaining experiences (title order) so the result always has up to `limit` entries when there is
 * enough content.
 */
export function pickForYou(
  experiences: readonly Experience[],
  selectedMood: Mood,
  limit = 4,
): Experience[] {
  const picked: Experience[] = [];
  const pickedIds = new Set<string>();

  const take = (experience: Experience | undefined) => {
    if (experience && !pickedIds.has(experience.id)) {
      picked.push(experience);
      pickedIds.add(experience.id);
    }
  };

  take(experiences.find((experience) => experience.moods.includes(selectedMood)));
  take(experiences.find((experience) => experience.categoryIds.includes(PREFERRED_CATEGORY_ID)));
  take(
    [...experiences]
      .filter((experience) => experience.isPopular)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0],
  );
  take(
    [...experiences].sort(
      (a, b) => parseDistanceMeters(a.distanceLabel) - parseDistanceMeters(b.distanceLabel),
    )[0],
  );

  if (picked.length < limit) {
    for (const experience of experiences) {
      if (picked.length >= limit) break;
      take(experience);
    }
  }

  return picked.slice(0, limit);
}
