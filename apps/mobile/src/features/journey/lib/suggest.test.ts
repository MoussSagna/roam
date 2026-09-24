import type { Experience, JourneyContext, JourneyStartLocation } from '@/types';

import { defaultSelection, suggestForJourney } from './suggest';

const START: JourneyStartLocation = {
  kind: 'current',
  label: 'Ma position',
  coordinates: { latitude: 48.8674, longitude: 2.3637 },
};
const NEAR = { latitude: 48.8684, longitude: 2.3647 };
const FAR = { latitude: 48.7845, longitude: 2.0335 };

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
    coordinates: NEAR,
    ...overrides,
  };
}

const CONTEXT: JourneyContext = { mood: 'calm', duration: '3h', budget: 'medium' };

describe('suggestForJourney', () => {
  it('drops what does not fit (budget, duration, distance) and ranks the ambiance first', () => {
    const { suggestions, relaxed } = suggestForJourney(
      [
        experience({ id: 'other-mood', moods: ['festive'] }),
        experience({ id: 'calm', moods: ['calm'] }),
        experience({ id: 'too-expensive', moods: ['calm'], estimatedBudget: '50plus' }),
        experience({ id: 'too-long', moods: ['calm'], estimatedDurationMin: 240 }),
        experience({ id: 'too-far', moods: ['calm'], coordinates: FAR }),
      ],
      CONTEXT,
      START,
    );

    expect(relaxed).toBe(false);
    expect(suggestions.map((item) => item.experience.id)).toEqual(['calm', 'other-mood']);
    expect(suggestions[0].reason).toBe('mood');
    expect(suggestions[1].reason).toBe('nearby');
  });

  it('relaxes the constraints rather than returning nothing', () => {
    const { suggestions, relaxed } = suggestForJourney(
      [experience({ id: 'long', estimatedDurationMin: 300 })],
      { ...CONTEXT, duration: '1h' },
      START,
    );

    expect(relaxed).toBe(true);
    expect(suggestions.map((item) => item.experience.id)).toEqual(['long']);
  });

  it('is empty (not relaxed) when there is no experience at all', () => {
    expect(suggestForJourney([], CONTEXT, START)).toEqual({ suggestions: [], relaxed: false });
  });
});

describe('defaultSelection', () => {
  it('pre-selects the best ones while they fit the time available, at most three', () => {
    const suggestions = ['a', 'b', 'c', 'd'].map((id) => ({
      experience: experience({ id, estimatedDurationMin: 60 }),
      reason: 'mood' as const,
      distanceM: 100,
    }));

    expect(defaultSelection(suggestions, '2h')).toEqual(['a', 'b']);
    expect(defaultSelection(suggestions, 'day')).toEqual(['a', 'b', 'c']);
  });

  it('always keeps at least one', () => {
    const [only] = [
      {
        experience: experience({ id: 'x', estimatedDurationMin: 240 }),
        reason: 'mood' as const,
        distanceM: 0,
      },
    ];
    expect(defaultSelection([only], '1h')).toEqual(['x']);
  });
});
