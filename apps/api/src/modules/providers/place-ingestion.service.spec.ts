import { Logger } from '@nestjs/common';

import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { CategoryRepository } from '../catalog/category.repository.js';
import type { PlaceRepository, PlaceUpsert } from '../catalog/place.repository.js';
import { PlaceIngestionService } from './place-ingestion.service.js';
import type { NormalizedPlace, PlaceProvider } from './provider.types.js';

const NOW = new Date('2026-09-27T10:00:00Z');
const PROVIDER = { key: 'google_places', name: 'Google Places' };

const normalized = (overrides: Partial<NormalizedPlace> = {}): NormalizedPlace => ({
  source: {
    providerKey: 'google_places',
    externalId: 'ChIJ-1',
    externalUrl: 'https://maps.google.com/?cid=1',
    providerCategories: ['cafe', 'unknown_type'],
  },
  name: 'Café de la Paix',
  address: '1 Rue Test',
  city: 'Paris',
  latitude: 48.86,
  longitude: 2.36,
  priceLevel: 'LOW',
  rating: 4.2,
  reviewCount: 10,
  isActive: true,
  categorySlugs: ['cafe', 'nature'],
  ...overrides,
});

function setup() {
  const places = {
    upsertFromSource: vi.fn((input: PlaceUpsert) =>
      Promise.resolve({ place: { id: 'p1', name: input.facts.name }, outcome: 'created' as const }),
    ),
  };
  const categories = { list: vi.fn().mockResolvedValue([{ id: 'c1', slug: 'cafe' }]) };
  const service = new PlaceIngestionService(
    places as unknown as PlaceRepository,
    categories as unknown as CategoryRepository,
    { now: () => NOW },
  );
  const lastInput = () => places.upsertFromSource.mock.calls.at(-1)![0];
  return { places, categories, service, lastInput };
}

describe('PlaceIngestionService (repository mocked)', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('passes the primary facts, the fill-only facts, known categories only and the provenance', async () => {
    const { service, lastInput } = setup();
    await service.upsert(
      PROVIDER,
      normalized({
        description: 'Un café',
        website: 'https://cafe.test/',
        rnbId: 'ABCD1234EFGH',
        attribution: 'Producteur',
        providerUpdatedAt: new Date('2026-09-01T00:00:00Z'),
        images: [
          {
            url: 'https://img/1.jpg',
            license: 'CC BY',
            credit: '© X',
            rightsStartDate: null,
            rightsEndDate: null,
          },
        ],
      }),
    );

    const input = lastInput();
    expect(input.facts).toEqual({
      name: 'Café de la Paix',
      address: '1 Rue Test',
      city: 'Paris',
      latitude: 48.86,
      longitude: 2.36,
      priceLevel: 'LOW',
      rating: 4.2,
      reviewCount: 10,
    });
    expect(input.fill).toMatchObject({
      description: 'Un café',
      website: 'https://cafe.test/',
      rnbId: 'ABCD1234EFGH',
    });
    // `nature` is not in the catalog: never written (a missing slug would fail the whole write).
    expect(input.categorySlugs).toEqual(['cafe']);
    expect(input.source).toMatchObject({
      provider: PROVIDER,
      externalId: 'ChIJ-1',
      fetchedAt: NOW,
      attribution: 'Producteur',
      providerUpdatedAt: new Date('2026-09-01T00:00:00Z'),
      obsoleteAt: null,
    });
    expect(input.source.images).toHaveLength(1);
    // Locks: the normalized name (concurrent imports of the same place from two providers are serialized).
    expect(input.match?.lockNames).toEqual(['cafe paix']);
  });

  it('a closed place marks its own record obsolete (the repository deactivates the place when all are)', async () => {
    const { service, lastInput } = setup();
    await service.upsert(PROVIDER, normalized({ isActive: false }));
    expect(lastInput().source.obsoleteAt).toEqual(NOW);
  });

  it('deduplication decision: same provider or the curated DATA-1 catalog are never merge targets', async () => {
    const { service, lastInput } = setup();
    await service.upsert(PROVIDER, normalized());
    const decide = lastInput().match!.decide;
    const candidate = {
      id: 'x',
      name: 'Café de la Paix',
      latitude: 48.86,
      longitude: 2.36,
      rnbId: null,
    };
    expect(decide([{ ...candidate, providerKeys: ['geoapify'] }])).toEqual({
      placeId: 'x',
      rule: 'proximity',
    });
    expect(decide([{ ...candidate, providerKeys: ['google_places'] }]).placeId).toBeNull();
    expect(decide([{ ...candidate, providerKeys: ['mobile_mock_migration'] }]).placeId).toBeNull();
  });

  it('importNearby: one provider call, one upsert per place, a report by outcome', async () => {
    const { service, places } = setup();
    places.upsertFromSource
      .mockResolvedValueOnce({ place: { id: 'a' }, outcome: 'created' } as never)
      .mockResolvedValueOnce({ place: { id: 'b' }, outcome: 'matched' } as never)
      .mockResolvedValueOnce({ place: { id: 'c' }, outcome: 'unchanged' } as never);
    const provider = {
      identity: PROVIDER,
      searchNearby: vi
        .fn()
        .mockResolvedValue([
          normalized(),
          normalized({ source: { ...normalized().source, externalId: '2' } }),
          normalized({ source: { ...normalized().source, externalId: '3' } }),
        ]),
      getPlace: vi.fn(),
    } as unknown as PlaceProvider;

    const report = await service.importNearby(provider, {
      latitude: 48.86,
      longitude: 2.36,
      radiusMeters: 500,
    });
    expect(report).toMatchObject({ created: 1, matched: 1, updated: 0, unchanged: 1 });
    expect(report.places.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('persistence errors are not swallowed', async () => {
    const { service, places } = setup();
    places.upsertFromSource.mockRejectedValue(new DatabaseUnavailableError());
    await expect(service.upsert(PROVIDER, normalized())).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });

  it('importPlace: null when the provider does not know the id, nothing written', async () => {
    const { service, places } = setup();
    const provider = {
      identity: PROVIDER,
      searchNearby: vi.fn(),
      getPlace: vi.fn().mockResolvedValue(null),
    } as unknown as PlaceProvider;
    await expect(service.importPlace(provider, 'unknown')).resolves.toBeNull();
    expect(places.upsertFromSource).not.toHaveBeenCalled();
  });
});
