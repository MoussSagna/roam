import type {
  BudgetRange,
  Experience,
  JourneyBudget,
  JourneyContext,
  JourneyDuration,
  JourneyStartLocation,
} from '@/types';

import { distanceMeters } from './plan';

export const JOURNEY_DURATION_MIN: Record<JourneyDuration, number> = {
  '1h': 60,
  '2h': 120,
  '3h': 180,
  halfDay: 240,
  day: 480,
};

/** Budget brackets each choice accepts. */
const BUDGET_ACCEPTS: Record<JourneyBudget, readonly BudgetRange[]> = {
  free: ['free'],
  low: ['free', 'under10'],
  medium: ['free', 'under10', '10to25'],
  high: ['free', 'under10', '10to25', '25to50', '50plus'],
};

/** How far a candidate may be from the start point, by available time. */
const MAX_DISTANCE_M: Record<JourneyDuration, number> = {
  '1h': 3000,
  '2h': 5000,
  '3h': 8000,
  halfDay: 15000,
  day: Number.POSITIVE_INFINITY,
};

const NEAR_M = 2000;
/** A journey proposes at most this many experiences at first. */
export const DEFAULT_SELECTION_MAX = 3;

/** The human reason shown on a suggestion — always an actually matched constraint. */
export type SuggestionReason = 'mood' | 'nearby' | 'budget';

export type JourneySuggestion = {
  experience: Experience;
  reason: SuggestionReason;
  distanceM: number | null;
};

export type JourneySuggestions = {
  suggestions: JourneySuggestion[];
  /** Nothing passed every constraint: the list is the closest alternatives, constraints relaxed. */
  relaxed: boolean;
};

function fits(experience: Experience, context: JourneyContext, distanceM: number | null): boolean {
  return (
    BUDGET_ACCEPTS[context.budget].includes(experience.estimatedBudget) &&
    experience.estimatedDurationMin <= JOURNEY_DURATION_MIN[context.duration] &&
    (distanceM === null || distanceM <= MAX_DISTANCE_M[context.duration])
  );
}

function score(experience: Experience, context: JourneyContext, distanceM: number | null): number {
  let value = 0;
  if (experience.moods.includes(context.mood)) value += 3;
  if (distanceM !== null && distanceM <= NEAR_M) value += 2;
  else if (distanceM !== null && distanceM <= 5000) value += 1;
  return value + (experience.rating ?? 0) / 10;
}

function reasonFor(
  experience: Experience,
  context: JourneyContext,
  distanceM: number | null,
): SuggestionReason {
  if (experience.moods.includes(context.mood)) return 'mood';
  if (distanceM !== null && distanceM <= NEAR_M) return 'nearby';
  return 'budget';
}

/** One experience as a suggestion (its distance and reason), e.g. an experience the flow was opened
 * from, shown even when the ranking didn't pick it. */
export function toSuggestion(
  experience: Experience,
  context: JourneyContext,
  start: JourneyStartLocation,
): JourneySuggestion {
  const distanceM = experience.coordinates
    ? distanceMeters(start.coordinates, experience.coordinates)
    : null;
  return { experience, distanceM, reason: reasonFor(experience, context, distanceM) };
}

/**
 * Journey suggestions over the existing experience pool, following `07_DATA_AND_RECOMMENDATION.md`:
 * first drop impossible candidates (budget, duration, distance from the start point), then rank with a
 * simple explainable score (ambiance, proximity, rating) — no numeric score shown, one human reason
 * per card. When nothing fits, the constraints are relaxed rather than returning an empty list.
 */
export function suggestForJourney(
  pool: readonly Experience[],
  context: JourneyContext,
  start: JourneyStartLocation,
  limit = 8,
): JourneySuggestions {
  const candidates = pool.map((experience) => ({
    experience,
    distanceM: experience.coordinates
      ? distanceMeters(start.coordinates, experience.coordinates)
      : null,
  }));

  const rank = (items: typeof candidates) =>
    [...items]
      .sort(
        (a, b) =>
          score(b.experience, context, b.distanceM) - score(a.experience, context, a.distanceM),
      )
      .slice(0, limit)
      .map(({ experience, distanceM }) => ({
        experience,
        distanceM,
        reason: reasonFor(experience, context, distanceM),
      }));

  const fitting = candidates.filter(({ experience, distanceM }) =>
    fits(experience, context, distanceM),
  );
  if (fitting.length > 0) return { suggestions: rank(fitting), relaxed: false };
  return { suggestions: rank(candidates), relaxed: candidates.length > 0 };
}

/**
 * The experiences pre-selected for the user: best-ranked first, while their durations fit the time
 * available (at least one, at most `DEFAULT_SELECTION_MAX`).
 */
export function defaultSelection(
  suggestions: readonly JourneySuggestion[],
  duration: JourneyDuration,
): string[] {
  const available = JOURNEY_DURATION_MIN[duration];
  const selected: string[] = [];
  let used = 0;
  for (const { experience } of suggestions) {
    if (selected.length >= DEFAULT_SELECTION_MAX) break;
    if (selected.length > 0 && used + experience.estimatedDurationMin > available) continue;
    selected.push(experience.id);
    used += experience.estimatedDurationMin;
  }
  return selected;
}
