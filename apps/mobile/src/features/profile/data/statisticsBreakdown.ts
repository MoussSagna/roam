import type { MoodBreakdownId } from '@/theme';

/**
 * "Mes statistiques" (mockup tile 05): static, curated display numbers, same "plain mock content"
 * convention as `User.stats` (`docs/DECISIONS.md` D-09/D-50) — not derived from the favorites/history
 * pools, since nothing in this prototype tracks a real per-outing genre/mood/city yet.
 */

/** "Tes genres préférés": ids reuse `EXPERIENCE_TYPES` (`features/profile/data/experienceTypes.ts`)
 * for their label/icon rather than duplicating them here. */
export const GENRE_BREAKDOWN: readonly { id: string; percentage: number }[] = [
  { id: 'culture', percentage: 32 },
  { id: 'restaurants', percentage: 24 },
  { id: 'nightlife', percentage: 20 },
  { id: 'nature', percentage: 12 },
  { id: 'activities', percentage: 8 },
  { id: 'events', percentage: 4 },
];

export const MOOD_BREAKDOWN: readonly { id: MoodBreakdownId; percentage: number }[] = [
  { id: 'relaxed', percentage: 42 },
  { id: 'curious', percentage: 25 },
  { id: 'festive', percentage: 17 },
  { id: 'romantic', percentage: 8 },
  { id: 'family', percentage: 8 },
];

export const CITY_BREAKDOWN = [
  { key: 'statistics.cities.paris', percentage: 85 },
  { key: 'statistics.cities.lyon', percentage: 10 },
  { key: 'statistics.cities.other', percentage: 5 },
] as const;

/** "Tout / 30 jours / 6 mois / 1 an" filter chips. Local selection only — there is no real
 * per-range dataset behind them yet (same "control wired to local state, not real logic yet"
 * precedent as the onboarding `LocationScreen`, `docs/DECISIONS.md` D-24). */
export const STATISTICS_RANGES = ['all', '30d', '6m', '1y'] as const;
export type StatisticsRange = (typeof STATISTICS_RANGES)[number];
