import { freshnessOf, SOURCE_TTLS, staleBefore, ttlFor } from './freshness.js';

const NOW = new Date('2026-09-27T12:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe('freshness and TTLs', () => {
  it('FRESH before fetchedAt + TTL, STALE after, OBSOLETE once the provider said so (whatever the age)', () => {
    expect(freshnessOf({ fetchedAt: ago(0.5), obsoleteAt: null }, DAY, NOW)).toBe('FRESH');
    expect(freshnessOf({ fetchedAt: ago(1), obsoleteAt: null }, DAY, NOW)).toBe('STALE');
    expect(freshnessOf({ fetchedAt: ago(0), obsoleteAt: ago(0) }, DAY, NOW)).toBe('OBSOLETE');
  });

  it('one TTL per provider and entity, justified in DATA_PERSISTENCE_AND_SYNC.md', () => {
    expect(ttlFor('google_places', 'PLACE')).toBe(30 * DAY);
    expect(ttlFor('geoapify', 'PLACE')).toBe(30 * DAY);
    expect(ttlFor('ticketmaster', 'EVENT')).toBe(DAY);
    expect(ttlFor('ticketmaster', 'PLACE')).toBe(7 * DAY);
    expect(ttlFor('datatourisme', 'PLACE')).toBe(7 * DAY);
    expect(ttlFor('datatourisme', 'EVENT')).toBe(DAY);
    expect(ttlFor('basilic', 'PLACE')).toBe(30 * DAY);
    expect(ttlFor('data_es', 'PLACE')).toBe(DAY);
    expect(Object.keys(SOURCE_TTLS).sort()).toEqual(
      ['basilic', 'data_es', 'datatourisme', 'geoapify', 'google_places', 'ticketmaster'].sort(),
    );
  });

  it('no TTL → no refresh by accident (the DATA-1 internal catalog, an entity a provider does not give)', () => {
    expect(() => ttlFor('mobile_mock_migration', 'PLACE')).toThrow(RangeError);
    expect(() => ttlFor('basilic', 'EVENT')).toThrow(RangeError);
    expect(staleBefore('ticketmaster', 'EVENT', NOW)).toEqual(ago(1));
  });
});
