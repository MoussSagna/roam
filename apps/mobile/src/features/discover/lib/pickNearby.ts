import { parseDistanceMeters } from '@/features/home/lib/pickForYou';
import type { Experience } from '@/types';

/**
 * Deterministic "Près de toi" pool (Discover, sprint 6 §"Section 4"): experiences with a distance
 * label, nearest first. No real geolocation (`08_AGENT_TODO.md` Phase E) — same mock-distance sort as
 * Home's own "Des idées pour toi" rule (`pickForYou`), reusing its distance parser.
 */
export function pickNearby(experiences: readonly Experience[], limit = 8): Experience[] {
  return [...experiences]
    .filter((experience) => experience.distanceLabel)
    .sort((a, b) => parseDistanceMeters(a.distanceLabel) - parseDistanceMeters(b.distanceLabel))
    .slice(0, limit);
}
