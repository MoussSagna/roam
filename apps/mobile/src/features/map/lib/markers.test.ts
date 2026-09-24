import type { Experience } from '@/types';

import { isPinnable, toMapMarkers } from './markers';

function makeExperience(overrides: Partial<Experience>): Experience {
  return {
    id: 'exp-x',
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

describe('isPinnable', () => {
  it('is true only for an experience with coordinates', () => {
    expect(isPinnable(makeExperience({ coordinates: { latitude: 1, longitude: 2 } }))).toBe(true);
    expect(isPinnable(makeExperience({}))).toBe(false);
  });
});

describe('toMapMarkers', () => {
  it('turns pinnable experiences into markers, keyed by id and named after the title', () => {
    const markers = toMapMarkers([
      makeExperience({ id: 'exp-a', title: 'A', coordinates: { latitude: 1, longitude: 2 } }),
    ]);

    expect(markers).toEqual([
      { id: 'exp-a', title: 'A', coordinate: { latitude: 1, longitude: 2 } },
    ]);
  });

  it('carries the experience cover photo as the marker image', () => {
    const photo = { uri: 'https://example.com/a.jpg' };
    const [marker] = toMapMarkers([
      makeExperience({ coordinates: { latitude: 1, longitude: 2 }, coverImage: photo }),
    ]);

    expect(marker.image).toBe(photo);
  });

  it('leaves out experiences without coordinates, without crashing', () => {
    const markers = toMapMarkers([
      makeExperience({ id: 'exp-a', coordinates: { latitude: 1, longitude: 2 } }),
      makeExperience({ id: 'exp-b' }),
    ]);

    expect(markers.map((marker) => marker.id)).toEqual(['exp-a']);
  });

  it('returns an empty array for no experiences', () => {
    expect(toMapMarkers([])).toEqual([]);
  });
});
