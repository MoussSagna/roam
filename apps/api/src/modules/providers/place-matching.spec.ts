import {
  compatibleNames,
  distanceMeters,
  type MatchCandidate,
  matchPlace,
  normalizePlaceName,
} from './place-matching.js';

const PROTECTED = new Set(['mobile_mock_migration']);
const subject = {
  providerKey: 'datatourisme',
  name: "Musée d'Orsay",
  latitude: 48.86,
  longitude: 2.3266,
  rnbId: 'ABCDEFGH1234' as string | null,
};
const candidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: 'p1',
  name: 'Musée d’Orsay',
  latitude: 48.8601,
  longitude: 2.3267,
  rnbId: null,
  providerKeys: ['data_es'],
  ...overrides,
});
/** A point `meters` north of the subject. */
const north = (meters: number) => subject.latitude + meters / 111_195;

describe('place matching (cross-provider deduplication rules)', () => {
  it('normalizes names: case, accents, punctuation, stop words', () => {
    expect(normalizePlaceName("Le Musée d'Orsay")).toBe('musee orsay');
    expect(normalizePlaceName('CAFÉ DE LA PAIX !')).toBe('cafe paix');
    expect(compatibleNames('Piscine Pontoise', 'Piscine municipale de Pontoise')).toBe(true);
    expect(compatibleNames('Musée du Louvre', 'Café Marly')).toBe(false);
    expect(
      Math.round(distanceMeters(subject, { latitude: north(100), longitude: subject.longitude })),
    ).toBe(100);
  });

  it('same RNB + compatible names + close → the same place (rule rnb)', () => {
    expect(
      matchPlace(
        subject,
        [candidate({ rnbId: 'ABCDEFGH1234', name: 'Musée d’Orsay (entrée)', latitude: north(90) })],
        PROTECTED,
      ),
    ).toEqual({ placeId: 'p1', rule: 'rnb' });
  });

  it('same RNB but different names: one building, two places (a museum and its café) → kept apart', () => {
    expect(
      matchPlace(subject, [candidate({ rnbId: 'ABCDEFGH1234', name: 'Café Campana' })], PROTECTED),
    ).toEqual({ placeId: null, rule: 'none' });
  });

  it('RNB absent: same normalized name within 30 m → the same place (rule proximity)', () => {
    expect(
      matchPlace({ ...subject, rnbId: null }, [candidate({ latitude: north(20) })], PROTECTED),
    ).toEqual({
      placeId: 'p1',
      rule: 'proximity',
    });
  });

  it('similar names but different places (not the same normalized name) → no merge', () => {
    expect(
      matchPlace(
        { ...subject, rnbId: null, name: 'Café Oberkampf' },
        [candidate({ name: 'Café Oberkampf 2' })],
        PROTECTED,
      ),
    ).toEqual({ placeId: null, rule: 'none' });
  });

  it('close coordinates but different places → no merge; same name 100 m away without RNB → no merge', () => {
    expect(
      matchPlace({ ...subject, rnbId: null }, [candidate({ name: 'Boulangerie Orsay' })], PROTECTED)
        .placeId,
    ).toBeNull();
    expect(
      matchPlace({ ...subject, rnbId: null }, [candidate({ latitude: north(100) })], PROTECTED)
        .placeId,
    ).toBeNull();
  });

  it('two different buildings (RNB ids differ) are two places, whatever the names', () => {
    expect(
      matchPlace(subject, [candidate({ rnbId: 'ZZZZZZZZ9999', latitude: north(5) })], PROTECTED)
        .placeId,
    ).toBeNull();
  });

  it('several qualifying candidates → ambiguous, no merge (a wrong merge is worse than a duplicate)', () => {
    expect(
      matchPlace(
        { ...subject, rnbId: null },
        [candidate({ id: 'a' }), candidate({ id: 'b', providerKeys: ['geoapify'] })],
        PROTECTED,
      ),
    ).toEqual({ placeId: null, rule: 'ambiguous' });
  });

  it('never into a place that already has a record of the same provider, nor into the curated DATA-1 catalog', () => {
    expect(
      matchPlace(subject, [candidate({ providerKeys: ['datatourisme'] })], PROTECTED).placeId,
    ).toBeNull();
    expect(
      matchPlace(subject, [candidate({ providerKeys: ['mobile_mock_migration'] })], PROTECTED)
        .placeId,
    ).toBeNull();
  });
});
