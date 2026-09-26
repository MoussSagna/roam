import type { TravelMode } from '../../generated/prisma/enums.js';
import type { JourneyPlan, JourneyStepInput } from './journey.types.js';

/**
 * Journey planning (JOURNEY.md "Planning"): the rules of the mobile `features/journey/lib/plan.ts` and
 * `lib/progress.ts`, ported as they are — straight-line distances, walk or métro legs, arrivals from the start time,
 * totals. Pure functions; no routing or Directions API.
 */

/** Walking pace: 4.8 km/h. */
const WALK_METERS_PER_MIN = 80;
/** Past this, a leg is done by métro rather than on foot. */
const WALK_MAX_METERS = 1500;
/** Métro: ~24 km/h plus a fixed access/wait time. */
const METRO_METERS_PER_MIN = 400;
const METRO_ACCESS_MIN = 6;

type Point = { latitude: number; longitude: number };

/** What planning needs from a catalog experience. */
export type PlannableExperience = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  /** `RoamEnrichment.estimatedDurationMin` — required to schedule a step. */
  durationMin: number;
  priceMin: number | null;
  priceMax: number | null;
};

export type BudgetBracket = 'free' | 'under10' | '10to25' | '25to50' | '50plus';

/** Euros per budget bracket (mobile `BUDGET_EUR`, "midpoint-ish"): a journey's budget is an estimate. */
export const BUDGET_EUR: Record<BudgetBracket, number> = {
  free: 0,
  under10: 8,
  '10to25': 18,
  '25to50': 38,
  '50plus': 60,
};

/**
 * The MVP budget bracket (MVP_SCOPE.md §3) a canonical price range falls in: by its lowest price, or by its ceiling
 * when only the ceiling is known. On the DATA-1 catalog (brackets stored as their bounds) it gives back the mobile
 * bracket exactly. `null`: no known price.
 */
export function budgetBracket(
  priceMin: number | null,
  priceMax: number | null,
): BudgetBracket | null {
  if (priceMin !== null) {
    if (priceMin === 0 && priceMax === 0) return 'free';
    if (priceMin < 10) return 'under10';
    if (priceMin < 25) return '10to25';
    if (priceMin < 50) return '25to50';
    return '50plus';
  }
  if (priceMax === null) return null;
  if (priceMax === 0) return 'free';
  if (priceMax <= 10) return 'under10';
  if (priceMax <= 25) return '10to25';
  if (priceMax <= 50) return '25to50';
  return '50plus';
}

/** Straight-line distance in meters (haversine), rounded. */
export function distanceMeters(a: Point, b: Point): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export type TravelLeg = { distanceM: number; durationMin: number; mode: TravelMode };

/** On foot up to 1.5 km, then métro. */
export function estimateTravel(from: Point, to: Point): TravelLeg {
  const distanceM = distanceMeters(from, to);
  if (distanceM === 0) return { distanceM: 0, durationMin: 0, mode: 'WALK' };
  if (distanceM <= WALK_MAX_METERS) {
    return {
      distanceM,
      durationMin: Math.max(1, Math.ceil(distanceM / WALK_METERS_PER_MIN)),
      mode: 'WALK',
    };
  }
  return {
    distanceM,
    durationMin: Math.ceil(distanceM / METRO_METERS_PER_MIN) + METRO_ACCESS_MIN,
    mode: 'METRO',
  };
}

/** "HH:MM" + minutes → "HH:MM" (wraps past midnight). */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Schedules the experiences in the given order from a start point and time. An experience without coordinates keeps
 * the previous point (no travel to it can be estimated); an experience without a known price adds nothing to the
 * budget estimate.
 */
export function buildPlan(
  experiences: readonly PlannableExperience[],
  start: Point,
  startTime: string,
): JourneyPlan & { steps: JourneyStepInput[] } {
  let position = start;
  let clock = 0;
  let totalDistanceM = 0;
  let estimatedBudgetEur = 0;

  const steps = experiences.map((experience): JourneyStepInput => {
    const point =
      experience.latitude === null || experience.longitude === null
        ? null
        : { latitude: experience.latitude, longitude: experience.longitude };
    const leg = point
      ? estimateTravel(position, point)
      : { distanceM: 0, durationMin: 0, mode: 'WALK' as const };
    clock += leg.durationMin;
    const step: JourneyStepInput = {
      experienceId: experience.id,
      estimatedArrival: addMinutes(startTime, clock),
      estimatedDurationMin: experience.durationMin,
      travelDurationMin: leg.durationMin,
      travelDistanceM: leg.distanceM,
      travelMode: leg.mode,
    };
    clock += experience.durationMin;
    totalDistanceM += leg.distanceM;
    const bracket = budgetBracket(experience.priceMin, experience.priceMax);
    estimatedBudgetEur += bracket === null ? 0 : BUDGET_EUR[bracket];
    if (point) position = point;
    return step;
  });

  return {
    steps,
    endTime: addMinutes(startTime, clock),
    estimatedDurationMin: clock,
    estimatedBudgetEur,
    totalDistanceM,
  };
}

/**
 * The current step once the steps are edited (mobile `currentStepAfterEdit`, JOURNEY.md "Editing"): the current
 * experience stays current wherever it moved; if it was removed, as many steps as were done and remain are done and
 * the next one is current. Always within the new steps. (A backend journey is always started: `startedAt` is set at
 * creation.)
 */
export function currentStepAfterEdit(
  before: { experienceIds: readonly string[]; currentStep: number },
  experienceIds: readonly string[],
): number {
  if (experienceIds.length === 0) return 0;
  const stillCurrent = experienceIds.indexOf(before.experienceIds[before.currentStep] ?? '');
  if (stillCurrent >= 0) return stillCurrent;
  const doneStillThere = before.experienceIds
    .slice(0, before.currentStep)
    .filter((id) => experienceIds.includes(id)).length;
  return Math.min(doneStillThere, experienceIds.length - 1);
}
