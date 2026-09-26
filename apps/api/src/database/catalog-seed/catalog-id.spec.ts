import { catalogId, uuidV5 } from './catalog-id.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('catalog ids', () => {
  it('implements UUID v5 (RFC 9562 test vector)', () => {
    // DNS namespace, "www.example.com".
    expect(uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '2ed6657d-e927-568b-95e1-2665a8aea6a2',
    );
  });

  it('gives the same id for the same record, every time', () => {
    expect(catalogId('experience', 'exp-jazz-night')).toBe(
      catalogId('experience', 'exp-jazz-night'),
    );
    expect(catalogId('experience', 'exp-jazz-night')).toMatch(UUID);
  });

  it('gives different ids to different records and kinds', () => {
    const ids = [
      catalogId('experience', 'exp-jazz-night'),
      catalogId('experience', 'exp-live-concert'),
      catalogId('place', 'exp-jazz-night'),
      catalogId('category', 'cafe'),
      catalogId('provider', 'mobile_mock_migration'),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
