import type { Journey, JourneyStep } from '@/types';

/**
 * Where a journey stands (sprint 11, the Parcours hub): which steps are still ahead and how much time
 * and distance they add up to. Pure functions over the saved plan — nothing is recomputed.
 *
 * Before "Commencer" the whole journey is ahead; once started, the current step and the ones after it
 * are (the travel to the current step counts as done: the user is on their way or already there).
 */
export function remainingSteps(journey: Journey): JourneyStep[] {
  if (journey.status === 'completed') return [];
  if (!journey.startedAt) return journey.steps;
  return journey.steps.slice(journey.currentStep);
}

/** Steps after the current one (or after the first, before "Commencer"). */
export function upcomingSteps(journey: Journey): JourneyStep[] {
  return remainingSteps(journey).slice(1);
}

export function remainingDurationMin(journey: Journey): number {
  const steps = remainingSteps(journey);
  return steps.reduce(
    (total, step, index) =>
      total +
      step.estimatedDurationMin +
      (index === 0 && journey.startedAt ? 0 : step.travelDurationMin),
    0,
  );
}

export function remainingDistanceM(journey: Journey): number {
  const steps = remainingSteps(journey);
  return steps.reduce(
    (total, step, index) => total + (index === 0 && journey.startedAt ? 0 : step.travelDistanceM),
    0,
  );
}

/** Steps already done. */
export function completedStepCount(journey: Journey): number {
  if (journey.status === 'completed') return journey.steps.length;
  return journey.startedAt ? journey.currentStep : 0;
}

/**
 * The current step once the steps are edited (sprint 12, `/journey/[id]/edit`): the current experience
 * stays current wherever it moved; if it was removed, the first step not done yet (as many done steps
 * as are still there). Always within `experienceIds` (0 when empty or not started).
 */
export function currentStepAfterEdit(journey: Journey, experienceIds: readonly string[]): number {
  if (!journey.startedAt || experienceIds.length === 0) return 0;
  const before = journey.steps.map((step) => step.experienceId);
  const stillCurrent = experienceIds.indexOf(before[journey.currentStep] ?? '');
  if (stillCurrent >= 0) return stillCurrent;
  const doneStillThere = before
    .slice(0, journey.currentStep)
    .filter((id) => experienceIds.includes(id)).length;
  return Math.min(doneStillThere, experienceIds.length - 1);
}
