import type {
  BudgetRange,
  Coordinates,
  Experience,
  JourneyStartLocation,
  JourneyStep,
  JourneyTravelMode,
} from '@/types';

/** Walking pace: 4.8 km/h. */
const WALK_METERS_PER_MIN = 80;
/** Past this, a leg is done by métro rather than on foot. */
const WALK_MAX_METERS = 1500;
/** Métro: ~24 km/h plus a fixed access/wait time. */
const METRO_METERS_PER_MIN = 400;
const METRO_ACCESS_MIN = 6;

/**
 * Euros per budget bracket (midpoint-ish). The mock experiences carry a bracket and a display label,
 * not a price, so a journey's budget is an estimate — the same kind of approximation the UI already
 * shows ("≈ 45 €").
 */
export const BUDGET_EUR: Record<BudgetRange, number> = {
  free: 0,
  under10: 8,
  '10to25': 18,
  '25to50': 38,
  '50plus': 60,
};

/** Straight-line distance in meters (haversine). */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export type TravelLeg = { distanceM: number; durationMin: number; mode: JourneyTravelMode };

/** A realistic-enough leg without a routing API: on foot up to 1.5 km, then métro. */
export function estimateTravel(from: Coordinates, to: Coordinates): TravelLeg {
  const distanceM = distanceMeters(from, to);
  if (distanceM === 0) return { distanceM: 0, durationMin: 0, mode: 'walk' };
  if (distanceM <= WALK_MAX_METERS) {
    return {
      distanceM,
      durationMin: Math.max(1, Math.ceil(distanceM / WALK_METERS_PER_MIN)),
      mode: 'walk',
    };
  }
  return {
    distanceM,
    durationMin: Math.ceil(distanceM / METRO_METERS_PER_MIN) + METRO_ACCESS_MIN,
    mode: 'metro',
  };
}

/** "HH:MM" + minutes → "HH:MM" (wraps past midnight). */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** The next quarter hour from `now` — a journey created now starts at, e.g., 18:15. */
export function nextQuarterHour(now: Date): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil((minutes + 1) / 15) * 15;
  return addMinutes('00:00', rounded);
}

export type JourneyPlan = {
  steps: JourneyStep[];
  endTime: string;
  estimatedDurationMin: number;
  estimatedBudgetEur: number;
  totalDistanceM: number;
};

/**
 * Schedules experiences in the given order from a start point and time: travel legs, arrival times
 * and totals. Pure and deterministic; an experience without coordinates keeps the previous point
 * (no travel to it can be estimated).
 */
export function buildPlan(
  experiences: readonly Experience[],
  start: JourneyStartLocation,
  startTime: string,
): JourneyPlan {
  let position = start.coordinates;
  let clock = 0;
  let totalDistanceM = 0;
  let estimatedBudgetEur = 0;

  const steps = experiences.map((experience, order): JourneyStep => {
    const leg = experience.coordinates
      ? estimateTravel(position, experience.coordinates)
      : { distanceM: 0, durationMin: 0, mode: 'walk' as const };
    clock += leg.durationMin;
    const step: JourneyStep = {
      experienceId: experience.id,
      order,
      estimatedArrival: addMinutes(startTime, clock),
      estimatedDurationMin: experience.estimatedDurationMin,
      travelDurationMin: leg.durationMin,
      travelDistanceM: leg.distanceM,
      travelMode: leg.mode,
    };
    clock += experience.estimatedDurationMin;
    totalDistanceM += leg.distanceM;
    estimatedBudgetEur += BUDGET_EUR[experience.estimatedBudget];
    if (experience.coordinates) position = experience.coordinates;
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
