import {
  addMinutes,
  budgetBracket,
  buildPlan,
  currentStepAfterEdit,
  estimateTravel,
  type PlannableExperience,
} from './journey-planning.js';

const REPUBLIQUE = { latitude: 48.8674, longitude: 2.3637 };
// Two DATA-1 experiences (values of the migrated catalog).
const slowAfternoon: PlannableExperience = {
  id: 'slow',
  ...REPUBLIQUE,
  durationMin: 120,
  priceMin: null,
  priceMax: 10,
};
const rooftop: PlannableExperience = {
  id: 'rooftop',
  latitude: 48.8671,
  longitude: 2.3812,
  durationMin: 120,
  priceMin: 25,
  priceMax: 50,
};
const lakeHike: PlannableExperience = {
  id: 'lake',
  latitude: 48.7845,
  longitude: 2.0335,
  durationMin: 240,
  priceMin: 0,
  priceMax: 0,
};

describe('journey planning (the mobile plan.ts rules)', () => {
  it('plans legs, arrivals and totals from the start point and time', () => {
    const plan = buildPlan([slowAfternoon, rooftop], REPUBLIQUE, '14:00');

    expect(plan.steps).toEqual([
      {
        experienceId: 'slow',
        estimatedArrival: '14:00',
        estimatedDurationMin: 120,
        travelDurationMin: 0,
        travelDistanceM: 0,
        travelMode: 'WALK',
      },
      {
        experienceId: 'rooftop',
        estimatedArrival: '16:16',
        estimatedDurationMin: 120,
        travelDurationMin: 16, // 1280 m on foot at 80 m/min
        travelDistanceM: 1280,
        travelMode: 'WALK',
      },
    ]);
    expect(plan).toMatchObject({
      endTime: '18:16',
      estimatedDurationMin: 256,
      estimatedBudgetEur: 46, // under10 (8) + 25to50 (38)
      totalDistanceM: 1280,
    });
  });

  it('takes the métro past 1.5 km and wraps the clock past midnight', () => {
    expect(estimateTravel(REPUBLIQUE, { latitude: 48.7845, longitude: 2.0335 })).toEqual({
      distanceM: 25870,
      durationMin: 71, // ceil(25870 / 400) + 6
      mode: 'METRO',
    });
    expect(addMinutes('23:30', 45)).toBe('00:15');
    const plan = buildPlan([lakeHike], REPUBLIQUE, '22:00');
    expect(plan.endTime).toBe('03:11');
  });

  it('an experience without coordinates keeps the previous point; without a price adds nothing', () => {
    const unknown = {
      ...rooftop,
      id: 'x',
      latitude: null,
      longitude: null,
      priceMin: null,
      priceMax: null,
    };
    const plan = buildPlan([unknown, rooftop], REPUBLIQUE, '10:00');
    expect(plan.steps[0]).toMatchObject({
      travelDistanceM: 0,
      travelDurationMin: 0,
      estimatedArrival: '10:00',
    });
    expect(plan.steps[1]).toMatchObject({ travelDistanceM: 1280, estimatedArrival: '12:16' });
    expect(plan.estimatedBudgetEur).toBe(38);
  });

  it('budget brackets: gives back the mobile bracket on the DATA-1 price bounds', () => {
    expect(budgetBracket(0, 0)).toBe('free');
    expect(budgetBracket(null, 10)).toBe('under10');
    expect(budgetBracket(10, 25)).toBe('10to25');
    expect(budgetBracket(25, 50)).toBe('25to50');
    expect(budgetBracket(50, null)).toBe('50plus');
    expect(budgetBracket(null, null)).toBeNull();
    expect(budgetBracket(12, 30)).toBe('10to25');
    expect(budgetBracket(null, 40)).toBe('25to50');
  });

  it('current step after an edit: follows the current experience, else counts the done steps kept', () => {
    const before = { experienceIds: ['a', 'b', 'c', 'd'], currentStep: 2 }; // a, b done; c current
    expect(currentStepAfterEdit(before, ['c', 'a', 'b', 'd'])).toBe(0);
    expect(currentStepAfterEdit(before, ['a', 'b', 'd'])).toBe(2);
    expect(currentStepAfterEdit(before, ['b', 'd'])).toBe(1);
    expect(currentStepAfterEdit(before, ['a', 'b'])).toBe(1); // never past the end
    expect(currentStepAfterEdit(before, [])).toBe(0);
  });
});
