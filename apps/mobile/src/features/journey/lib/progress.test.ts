import type { Journey, JourneyStep } from '@/types';

import {
  completedStepCount,
  remainingDistanceM,
  remainingDurationMin,
  remainingSteps,
  upcomingSteps,
} from './progress';

const step = (
  experienceId: string,
  order: number,
  travel: number,
  distance: number,
): JourneyStep => ({
  experienceId,
  order,
  estimatedArrival: '18:00',
  estimatedDurationMin: 60,
  travelDurationMin: travel,
  travelDistanceM: distance,
  travelMode: 'walk',
});

const JOURNEY: Journey = {
  id: 'journey-1',
  status: 'active',
  title: 'Paris au coucher du soleil',
  createdAt: '2026-09-12T16:00:00.000Z',
  context: { mood: 'calm', duration: 'halfDay', budget: 'medium' },
  startLocation: {
    kind: 'current',
    label: 'Ma position',
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
  },
  startTime: '18:00',
  endTime: '21:40',
  estimatedDurationMin: 220,
  estimatedBudgetEur: 40,
  totalDistanceM: 1800,
  steps: [step('a', 0, 10, 600), step('b', 1, 15, 700), step('c', 2, 15, 500)],
  currentStep: 0,
  startedAt: null,
  completedAt: null,
};

describe('journey progress', () => {
  it('before "Commencer", the whole journey is ahead, travel included', () => {
    expect(remainingSteps(JOURNEY).map((s) => s.experienceId)).toEqual(['a', 'b', 'c']);
    expect(upcomingSteps(JOURNEY).map((s) => s.experienceId)).toEqual(['b', 'c']);
    expect(remainingDurationMin(JOURNEY)).toBe(3 * 60 + 10 + 15 + 15);
    expect(remainingDistanceM(JOURNEY)).toBe(1800);
    expect(completedStepCount(JOURNEY)).toBe(0);
  });

  it('once started, counts from the current step (its travel is behind)', () => {
    const journey = { ...JOURNEY, startedAt: '2026-09-12T16:05:00.000Z', currentStep: 1 };

    expect(remainingSteps(journey).map((s) => s.experienceId)).toEqual(['b', 'c']);
    expect(upcomingSteps(journey).map((s) => s.experienceId)).toEqual(['c']);
    expect(remainingDurationMin(journey)).toBe(60 + 60 + 15);
    expect(remainingDistanceM(journey)).toBe(500);
    expect(completedStepCount(journey)).toBe(1);
  });

  it('at the last step, nothing comes next', () => {
    const journey = { ...JOURNEY, startedAt: '2026-09-12T16:05:00.000Z', currentStep: 2 };

    expect(upcomingSteps(journey)).toEqual([]);
    expect(remainingDurationMin(journey)).toBe(60);
    expect(remainingDistanceM(journey)).toBe(0);
  });

  it('a completed journey has nothing left and every step done', () => {
    const journey: Journey = {
      ...JOURNEY,
      status: 'completed',
      startedAt: '2026-09-12T16:05:00.000Z',
      completedAt: '2026-09-12T19:45:00.000Z',
      currentStep: 2,
    };

    expect(remainingSteps(journey)).toEqual([]);
    expect(remainingDurationMin(journey)).toBe(0);
    expect(completedStepCount(journey)).toBe(3);
  });
});
