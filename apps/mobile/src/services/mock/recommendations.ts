import { pickForYou } from '@/features/home/lib/pickForYou';
import type { Experience, Mood } from '@/types';

import type { RecommendationRepository } from '../repositories/types';

/** Home's default mood, used when the caller gives none. */
const DEFAULT_MOOD: Mood = 'calm';
/** `pickForYou`'s own default: the size of Home's "Des idées pour toi". */
const DEFAULT_LIMIT = 4;

/**
 * Mock mode: the deterministic pool Home computed before API-12 (`pickForYou`: mood, preferred category, most
 * popular, nearest), unchanged. It ignores location, budget, time and company as it always did, and explains
 * nothing (no reasons) — the API does.
 */
export function createMockRecommendationRepository(
  experiences: readonly Experience[],
): RecommendationRepository {
  return {
    recommend: async (context) => ({
      items: pickForYou(
        structuredClone(experiences),
        context.mood ?? DEFAULT_MOOD,
        context.limit ?? DEFAULT_LIMIT,
      ).map((experience) => ({ experience, reasons: [] })),
      relaxed: [],
    }),
  };
}
