import type { Experience, JourneyStartLocation } from '@/types';

import { addMinutes, buildPlan, distanceMeters, estimateTravel, nextQuarterHour } from './plan';

const START: JourneyStartLocation = {
  kind: 'current',
  label: 'Ma position',
  coordinates: { latitude: 48.8674, longitude: 2.3637 },
};

function experience(overrides: Partial<Experience>): Experience {
  return {
    id: 'exp',
    title: 'Exp',
    description: '',
    moods: [],
    categoryIds: [],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'under10',
    ...overrides,
  };
}

describe('plan', () => {
  it('measures straight-line distances', () => {
    expect(distanceMeters(START.coordinates, START.coordinates)).toBe(0);
    // République → Buttes-Chaumont ≈ 2.1 km.
    const d = distanceMeters(START.coordinates, { latitude: 48.8809, longitude: 2.3828 });
    expect(d).toBeGreaterThan(1900);
    expect(d).toBeLessThan(2300);
  });

  it('walks short legs and takes the métro past 1.5 km', () => {
    const near = estimateTravel(START.coordinates, { latitude: 48.8704, longitude: 2.3637 });
    expect(near.mode).toBe('walk');
    expect(near.durationMin).toBe(Math.ceil(near.distanceM / 80));

    const far = estimateTravel(START.coordinates, { latitude: 48.8809, longitude: 2.3828 });
    expect(far.mode).toBe('metro');
    expect(far.durationMin).toBe(Math.ceil(far.distanceM / 400) + 6);
  });

  it('adds minutes to a clock time, wrapping past midnight', () => {
    expect(addMinutes('18:00', 75)).toBe('19:15');
    expect(addMinutes('23:30', 45)).toBe('00:15');
  });

  it('starts at the next quarter hour', () => {
    expect(nextQuarterHour(new Date(2026, 8, 24, 17, 52))).toBe('18:00');
    expect(nextQuarterHour(new Date(2026, 8, 24, 18, 0))).toBe('18:15');
  });

  it('schedules steps in order: travel, arrival, then duration; totals add up', () => {
    const plan = buildPlan(
      [
        experience({ id: 'a', coordinates: START.coordinates, estimatedDurationMin: 60 }),
        experience({
          id: 'b',
          coordinates: { latitude: 48.8704, longitude: 2.3637 },
          estimatedDurationMin: 90,
          estimatedBudget: '10to25',
        }),
      ],
      START,
      '18:00',
    );

    expect(plan.steps.map((step) => step.experienceId)).toEqual(['a', 'b']);
    expect(plan.steps.map((step) => step.order)).toEqual([0, 1]);
    expect(plan.steps[0]).toMatchObject({ estimatedArrival: '18:00', travelDurationMin: 0 });
    const leg = plan.steps[1].travelDurationMin;
    expect(plan.steps[1].estimatedArrival).toBe(addMinutes('19:00', leg));
    expect(plan.estimatedDurationMin).toBe(60 + leg + 90);
    expect(plan.endTime).toBe(addMinutes('18:00', 150 + leg));
    expect(plan.estimatedBudgetEur).toBe(8 + 18);
    expect(plan.totalDistanceM).toBe(plan.steps[1].travelDistanceM);
  });

  it('handles an experience without coordinates and an empty journey', () => {
    const plan = buildPlan([experience({ id: 'x' })], START, '10:00');
    expect(plan.steps[0]).toMatchObject({ travelDurationMin: 0, travelDistanceM: 0 });

    expect(buildPlan([], START, '10:00')).toMatchObject({
      steps: [],
      endTime: '10:00',
      estimatedDurationMin: 0,
      totalDistanceM: 0,
    });
  });
});
