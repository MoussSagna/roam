import type { Experience, Journey, JourneyStep } from '@/types';

import { JOURNEY_START_MARKER_ID, journeyMapData } from './journeyMap';

const experience = (id: string, latitude: number, withCoordinates = true): Experience =>
  ({
    id,
    title: `Titre ${id}`,
    coverImage: { uri: `https://example.test/${id}.jpg` },
    coordinates: withCoordinates ? { latitude, longitude: 2.35 } : undefined,
  }) as unknown as Experience;

const step = (experienceId: string, order: number): JourneyStep => ({
  experienceId,
  order,
  estimatedArrival: '18:00',
  estimatedDurationMin: 60,
  travelDurationMin: 10,
  travelDistanceM: 500,
  travelMode: 'walk',
});

const START = { latitude: 48.85, longitude: 2.3 };

const JOURNEY: Journey = {
  id: 'journey-1',
  status: 'active',
  title: 'Paris au coucher du soleil',
  createdAt: '2026-09-24T16:00:00.000Z',
  context: { mood: 'calm', duration: 'halfDay', budget: 'medium' },
  startLocation: { kind: 'current', label: 'Ma position', coordinates: START },
  startTime: '18:00',
  endTime: '21:00',
  estimatedDurationMin: 180,
  estimatedBudgetEur: 30,
  totalDistanceM: 1500,
  steps: [step('a', 0), step('b', 1), step('c', 2)],
  currentStep: 0,
  startedAt: null,
  completedAt: null,
};

const BY_ID = new Map([
  ['a', experience('a', 48.86)],
  ['b', experience('b', 48.87)],
  ['c', experience('c', 48.88)],
]);

describe('journeyMapData', () => {
  it('draws the start point then one numbered photo marker per step, in order', () => {
    const { markers } = journeyMapData(JOURNEY, BY_ID, 'Point de départ');

    expect(markers.map((marker) => marker.id)).toEqual([JOURNEY_START_MARKER_ID, 'a', 'b', 'c']);
    expect(markers[0]).toMatchObject({ title: 'Point de départ', coordinate: START });
    expect(markers[0].badge).toBeUndefined();
    expect(markers.slice(1).map((marker) => marker.badge)).toEqual(['1', '2', '3']);
    expect(markers.slice(1).map((marker) => marker.title)).toEqual([
      '1. Titre a',
      '2. Titre b',
      '3. Titre c',
    ]);
    expect(markers[1].image).toEqual({ uri: 'https://example.test/a.jpg' });
  });

  it('the route joins the start and the steps in order', () => {
    const { route } = journeyMapData(JOURNEY, BY_ID, 'Départ');
    expect(route).toEqual([
      START,
      { latitude: 48.86, longitude: 2.35 },
      { latitude: 48.87, longitude: 2.35 },
      { latitude: 48.88, longitude: 2.35 },
    ]);
  });

  it('highlights the current step: the first one before "Commencer", then the one in progress', () => {
    const before = journeyMapData(JOURNEY, BY_ID, 'Départ');
    expect(before.currentExperienceId).toBe('a');
    expect(before.markers.filter((marker) => marker.highlighted).map((m) => m.id)).toEqual(['a']);

    const started = journeyMapData(
      { ...JOURNEY, startedAt: '2026-09-24T16:05:00.000Z', currentStep: 1 },
      BY_ID,
      'Départ',
    );
    expect(started.currentExperienceId).toBe('b');
    expect(started.markers.filter((marker) => marker.highlighted).map((m) => m.id)).toEqual(['b']);
  });

  it('a completed journey has no current step', () => {
    const done = journeyMapData(
      { ...JOURNEY, status: 'completed', completedAt: '2026-09-24T19:00:00.000Z' },
      BY_ID,
      'Départ',
    );
    expect(done.currentExperienceId).toBeNull();
    expect(done.markers.some((marker) => marker.highlighted)).toBe(false);
  });

  it('a step without coordinates (or unknown) gets no marker, and keeps the others numbered as steps', () => {
    const byId = new Map(BY_ID);
    byId.set('b', experience('b', 0, false));
    byId.delete('c');
    const journey = { ...JOURNEY, steps: [...JOURNEY.steps, step('d', 3)] };
    byId.set('d', experience('d', 48.89));

    const { markers, route } = journeyMapData(journey, byId, 'Départ');
    expect(markers.map((marker) => marker.badge ?? marker.id)).toEqual([
      JOURNEY_START_MARKER_ID,
      '1',
      '4',
    ]);
    expect(route).toHaveLength(3);
  });
});
