import { Logger } from '@nestjs/common';

import { UniqueConstraintError } from '../../database/persistence-errors.js';
import type { CategoryRepository } from '../catalog/category.repository.js';
import type { PlaceRepository } from '../catalog/place.repository.js';
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
  name: 'Café',
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
  const places = { findBySource: vi.fn(), create: vi.fn(), updateFromSource: vi.fn() };
  const categories = { list: vi.fn().mockResolvedValue([{ id: 'c1', slug: 'cafe' }]) };
  const clock = { now: () => NOW };
  const service = new PlaceIngestionService(
    places as unknown as PlaceRepository,
    categories as unknown as CategoryRepository,
    clock,
  );
  return { places, categories, service };
}

const expectedSource = {
  provider: PROVIDER,
  externalId: 'ChIJ-1',
  externalUrl: 'https://maps.google.com/?cid=1',
  providerCategories: ['cafe', 'unknown_type'],
  fetchedAt: NOW,
};

const expectedFacts = {
  name: 'Café',
  address: '1 Rue Test',
  city: 'Paris',
  latitude: 48.86,
  longitude: 2.36,
  priceLevel: 'LOW',
  rating: 4.2,
  reviewCount: 10,
  isActive: true,
};

describe('PlaceIngestionService (repositories mocked)', () => {
  beforeEach(() => vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('unknown provider record → created with its provenance and the existing categories only', async () => {
    const { service, places } = setup();
    places.findBySource.mockResolvedValue(null);
    places.create.mockResolvedValue({ id: 'p1' });

    await expect(service.upsert(PROVIDER, normalized())).resolves.toEqual({
      place: { id: 'p1' },
      outcome: 'created',
    });
    expect(places.findBySource).toHaveBeenCalledWith('google_places', 'ChIJ-1');
    expect(places.create).toHaveBeenCalledWith({
      ...expectedFacts,
      categorySlugs: ['cafe'],
      source: expectedSource,
    });
  });

  it('known provider record → updated in place: provider facts and provenance only', async () => {
    const { service, places } = setup();
    places.findBySource.mockResolvedValue({ id: 'p1' });
    places.updateFromSource.mockResolvedValue({ id: 'p1' });

    await expect(service.upsert(PROVIDER, normalized())).resolves.toEqual({
      place: { id: 'p1' },
      outcome: 'updated',
    });
    expect(places.create).not.toHaveBeenCalled();
    expect(places.updateFromSource).toHaveBeenCalledWith('p1', expectedFacts, expectedSource);
    const change = places.updateFromSource.mock.calls[0][1] as Record<string, unknown>;
    for (const roamOwned of [
      'enrichment',
      'categorySlugs',
      'description',
      'photos',
      'openingHours',
      'attributes',
    ])
      expect(change).not.toHaveProperty(roamOwned);
  });

  it('a concurrent import that created the record first → update instead of failing', async () => {
    const { service, places } = setup();
    places.findBySource.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p9' });
    places.create.mockRejectedValue(new UniqueConstraintError());
    places.updateFromSource.mockResolvedValue({ id: 'p9' });

    await expect(service.upsert(PROVIDER, normalized())).resolves.toMatchObject({
      outcome: 'updated',
    });
    expect(places.updateFromSource).toHaveBeenCalledWith('p9', expectedFacts, expectedSource);
  });

  it('other write errors are not swallowed', async () => {
    const { service, places } = setup();
    places.findBySource.mockResolvedValue(null);
    places.create.mockRejectedValue(new Error('boom'));
    await expect(service.upsert(PROVIDER, normalized())).rejects.toThrow('boom');
  });

  it('importNearby: one provider call, one upsert per place, a report', async () => {
    const { service, places, categories } = setup();
    const searchNearby = vi
      .fn()
      .mockResolvedValue([
        normalized(),
        normalized({ source: { ...normalized().source, externalId: 'ChIJ-2' } }),
      ]);
    const provider: PlaceProvider = { identity: PROVIDER, searchNearby, getPlace: vi.fn() };
    places.findBySource.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p2' });
    places.create.mockResolvedValue({ id: 'p1' });
    places.updateFromSource.mockResolvedValue({ id: 'p2' });

    const report = await service.importNearby(provider, {
      latitude: 48.85,
      longitude: 2.35,
      radiusMeters: 500,
    });

    expect(searchNearby).toHaveBeenCalledTimes(1);
    expect(categories.list).toHaveBeenCalledTimes(1);
    expect(report).toEqual({ created: 1, updated: 1, places: [{ id: 'p1' }, { id: 'p2' }] });
  });

  it('importPlace: null when the provider does not know the id, nothing written', async () => {
    const { service, places } = setup();
    const provider: PlaceProvider = {
      identity: PROVIDER,
      searchNearby: vi.fn(),
      getPlace: vi.fn().mockResolvedValue(null),
    };

    await expect(service.importPlace(provider, 'ChIJ-gone')).resolves.toBeNull();
    expect(places.findBySource).not.toHaveBeenCalled();
  });
});
