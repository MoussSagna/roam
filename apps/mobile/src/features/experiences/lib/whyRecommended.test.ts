import type { Experience } from '@/types';

import { getWhyRecommended } from './whyRecommended';

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 'exp-test',
    title: 'Test',
    description: '',
    moods: [],
    categoryIds: [],
    placeIds: [],
    estimatedDurationMin: 60,
    estimatedBudget: 'free',
    ...overrides,
  };
}

describe('getWhyRecommended', () => {
  it('includes "interests" only when the experience has at least one mood', () => {
    expect(getWhyRecommended(makeExperience({ moods: ['calm'] }))).toContain('interests');
    expect(getWhyRecommended(makeExperience({ moods: [] }))).not.toContain('interests');
  });

  it('includes "budget" for free/under10/10to25 but not for pricier brackets', () => {
    expect(getWhyRecommended(makeExperience({ estimatedBudget: 'free' }))).toContain('budget');
    expect(getWhyRecommended(makeExperience({ estimatedBudget: '10to25' }))).toContain('budget');
    expect(getWhyRecommended(makeExperience({ estimatedBudget: '50plus' }))).not.toContain(
      'budget',
    );
  });

  it('includes "nearby" only within 5 km', () => {
    expect(getWhyRecommended(makeExperience({ distanceLabel: '800 m' }))).toContain('nearby');
    expect(getWhyRecommended(makeExperience({ distanceLabel: '4,5 km' }))).toContain('nearby');
    expect(getWhyRecommended(makeExperience({ distanceLabel: '18 km' }))).not.toContain('nearby');
    expect(getWhyRecommended(makeExperience({}))).not.toContain('nearby');
  });

  it('includes "openNow" only when opening hours are known', () => {
    expect(getWhyRecommended(makeExperience({ openingHoursLabel: '18:00 – 02:00' }))).toContain(
      'openNow',
    );
    expect(getWhyRecommended(makeExperience({}))).not.toContain('openNow');
  });

  it('returns all four reasons for a fully-qualified experience', () => {
    const experience = makeExperience({
      moods: ['calm'],
      estimatedBudget: 'under10',
      distanceLabel: '600 m',
      openingHoursLabel: '08:00 – 19:00',
    });
    expect(getWhyRecommended(experience)).toEqual(['interests', 'budget', 'nearby', 'openNow']);
  });
});
