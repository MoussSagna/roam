import { Logger } from '@nestjs/common';

import { UniqueConstraintError } from '../../database/persistence-errors.js';
import type { CategoryRepository } from '../catalog/category.repository.js';
import type { EventRepository } from '../catalog/event.repository.js';
import { EventIngestionService } from './event-ingestion.service.js';
import type { PlaceIngestionService } from './place-ingestion.service.js';
import type { EventProvider, NormalizedEvent, NormalizedPlace } from './provider.types.js';

const NOW = new Date('2026-09-27T10:00:00Z');
const PROVIDER = { key: 'ticketmaster', name: 'Ticketmaster' };

const VENUE: NormalizedPlace = {
  source: {
    providerKey: 'ticketmaster',
    externalId: 'v1',
    externalUrl: null,
    providerCategories: [],
  },
  name: 'Salle',
  address: null,
  city: 'Paris',
  latitude: 48.85,
  longitude: 2.35,
  priceLevel: 'UNKNOWN',
  rating: null,
  reviewCount: null,
  isActive: true,
  categorySlugs: [],
};

const normalized = (overrides: Partial<NormalizedEvent> = {}): NormalizedEvent => ({
  source: {
    providerKey: 'ticketmaster',
    externalId: 'Zk1',
    externalUrl: 'https://tm/1',
    providerCategories: ['segment:Arts & Theatre'],
  },
  title: 'Spectacle',
  description: null,
  startDate: new Date('2026-10-03T18:00:00Z'),
  endDate: null,
  timezone: 'Europe/Paris',
  images: [],
  priceMin: null,
  priceMax: null,
  currency: null,
  priceLevel: 'UNKNOWN',
  bookingUrl: 'https://tm/1',
  isActive: true,
  categorySlug: 'culture',
  venue: VENUE,
  ...overrides,
});

function setup() {
  const events = { findBySource: vi.fn(), create: vi.fn(), updateFromSource: vi.fn() };
  const categories = { list: vi.fn().mockResolvedValue([{ id: 'c1', slug: 'culture' }]) };
  const placeIngestion = {
    upsert: vi.fn().mockResolvedValue({ place: { id: 'place-1' }, outcome: 'created' }),
  };
  const service = new EventIngestionService(
    events as unknown as EventRepository,
    categories as unknown as CategoryRepository,
    placeIngestion as unknown as PlaceIngestionService,
    { now: () => NOW },
  );
  return { events, categories, placeIngestion, service };
}

const expectedSource = {
  provider: PROVIDER,
  externalId: 'Zk1',
  externalUrl: 'https://tm/1',
  providerCategories: ['segment:Arts & Theatre'],
  fetchedAt: NOW,
};

describe('EventIngestionService (repositories mocked)', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('first import: upserts the venue through PlaceIngestionService, creates the event linked to it', async () => {
    const { service, events, placeIngestion } = setup();
    events.findBySource.mockResolvedValue(null);
    events.create.mockResolvedValue({ id: 'e1' });

    await expect(service.upsert(PROVIDER, normalized())).resolves.toEqual({
      event: { id: 'e1' },
      outcome: 'created',
    });
    expect(placeIngestion.upsert).toHaveBeenCalledWith(PROVIDER, VENUE, expect.any(Set));
    expect(events.findBySource).toHaveBeenCalledWith('ticketmaster', 'Zk1');
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Spectacle',
        startDate: new Date('2026-10-03T18:00:00Z'),
        placeId: 'place-1',
        categorySlug: 'culture',
        source: expectedSource,
      }),
    );
  });

  it('a category the catalog does not have is not written; an event without venue has no place', async () => {
    const { service, events, placeIngestion } = setup();
    events.findBySource.mockResolvedValue(null);
    events.create.mockResolvedValue({ id: 'e1' });

    await service.upsert(PROVIDER, normalized({ categorySlug: 'nature', venue: null }));

    expect(placeIngestion.upsert).not.toHaveBeenCalled();
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: null, placeId: null }),
    );
  });

  it('known record: provider facts and provenance refreshed; never the category or the experience', async () => {
    const { service, events } = setup();
    events.findBySource.mockResolvedValue({ id: 'e1' });
    events.updateFromSource.mockResolvedValue({ id: 'e1' });

    const result = await service.upsert(PROVIDER, normalized({ title: 'Nouveau titre' }));

    expect(result.outcome).toBe('updated');
    const [id, change, source] = events.updateFromSource.mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(id).toBe('e1');
    expect(change).toMatchObject({ title: 'Nouveau titre', placeId: 'place-1' });
    expect(change).not.toHaveProperty('categorySlug');
    expect(change).not.toHaveProperty('experienceId');
    expect(source).toEqual(expectedSource);
    expect(events.create).not.toHaveBeenCalled();
  });

  it('refresh without a locatable venue keeps the existing venue link', async () => {
    const { service, events } = setup();
    events.findBySource.mockResolvedValue({ id: 'e1' });
    events.updateFromSource.mockResolvedValue({ id: 'e1' });

    await service.upsert(PROVIDER, normalized({ venue: null }));

    expect(
      (events.updateFromSource.mock.calls[0] as [string, { placeId?: string }])[1].placeId,
    ).toBe(undefined);
  });

  it('race: a concurrent import created the record first → update it', async () => {
    const { service, events } = setup();
    events.findBySource.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'e1' });
    events.create.mockRejectedValue(new UniqueConstraintError());
    events.updateFromSource.mockResolvedValue({ id: 'e1' });

    await expect(service.upsert(PROVIDER, normalized())).resolves.toMatchObject({
      outcome: 'updated',
    });
  });

  it('other persistence errors pass through', async () => {
    const { service, events } = setup();
    events.findBySource.mockResolvedValue(null);
    const failure = new Error('boom');
    events.create.mockRejectedValue(failure);
    await expect(service.upsert(PROVIDER, normalized())).rejects.toBe(failure);
  });

  it('importNearby: every event upserted, counts reported; provider errors propagate', async () => {
    const { service, events } = setup();
    events.findBySource.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'e2' });
    events.create.mockResolvedValue({ id: 'e1' });
    events.updateFromSource.mockResolvedValue({ id: 'e2' });
    const provider: EventProvider = {
      identity: PROVIDER,
      searchNearby: vi
        .fn()
        .mockResolvedValue([
          normalized(),
          normalized({ source: { ...normalized().source, externalId: 'Zk2' } }),
        ]),
      getEvent: vi.fn(),
    };

    const report = await service.importNearby(provider, {
      latitude: 48.85,
      longitude: 2.35,
      radiusMeters: 1000,
    });

    expect(report).toMatchObject({ created: 1, updated: 1 });
    expect(report.events).toHaveLength(2);

    const failing: EventProvider = {
      ...provider,
      searchNearby: vi.fn().mockRejectedValue(new Error('provider down')),
    };
    await expect(
      service.importNearby(failing, { latitude: 48.85, longitude: 2.35, radiusMeters: 1000 }),
    ).rejects.toThrow('provider down');
  });

  it('importEvent: unknown to the provider → null, nothing written', async () => {
    const { service, events } = setup();
    const provider: EventProvider = {
      identity: PROVIDER,
      searchNearby: vi.fn(),
      getEvent: vi.fn().mockResolvedValue(null),
    };
    await expect(service.importEvent(provider, 'gone')).resolves.toBeNull();
    expect(events.create).not.toHaveBeenCalled();
  });
});
