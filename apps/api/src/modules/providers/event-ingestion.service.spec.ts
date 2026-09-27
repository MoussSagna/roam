import { Logger } from '@nestjs/common';

import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { CategoryRepository } from '../catalog/category.repository.js';
import type { EventRepository, EventUpsert } from '../catalog/event.repository.js';
import { EventIngestionService, InvalidProviderRecordError } from './event-ingestion.service.js';
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
  const events = {
    upsertFromSource: vi.fn((input: EventUpsert) =>
      Promise.resolve({
        event: { id: 'e1', title: input.facts.title },
        outcome: 'created' as const,
      }),
    ),
  };
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
  const lastInput = () => events.upsertFromSource.mock.calls.at(-1)![0];
  return { events, categories, placeIngestion, service, lastInput };
}

describe('EventIngestionService (repository mocked)', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('Ticketmaster instant: venue through PlaceIngestionService, local date/time derived in the event zone', async () => {
    const { service, placeIngestion, lastInput } = setup();
    await service.upsert(PROVIDER, normalized());

    expect(placeIngestion.upsert).toHaveBeenCalledWith(PROVIDER, VENUE, expect.any(Set));
    const input = lastInput();
    expect(input.placeId).toBe('place-1');
    expect(input.categorySlug).toBe('culture');
    // 18:00Z on 3 Oct = 20:00 in Paris (summer time).
    expect(input.facts).toMatchObject({
      startDate: new Date('2026-10-03T18:00:00Z'),
      timezone: 'Europe/Paris',
      localStartDate: '2026-10-03',
      localStartTime: '20:00',
      address: null,
      latitude: null,
    });
    expect(input.source).toMatchObject({
      provider: PROVIDER,
      externalId: 'Zk1',
      fetchedAt: NOW,
      obsoleteAt: null,
    });
  });

  it('date-only event: no instant, no invented time; its own location; images with rights on the source', async () => {
    const { service, placeIngestion, lastInput } = setup();
    const image = {
      url: 'https://img/a.jpg',
      license: 'CC BY',
      credit: '© A',
      rightsStartDate: null,
      rightsEndDate: null,
    };
    await service.upsert(
      PROVIDER,
      normalized({
        startDate: null,
        localStartDate: '2026-11-04',
        localEndDate: '2026-11-05',
        venue: null,
        location: {
          address: '1 rue X, 75001 Paris',
          city: 'Paris',
          latitude: 48.86,
          longitude: 2.34,
        },
        sourceImages: [image],
      }),
    );
    expect(placeIngestion.upsert).not.toHaveBeenCalled();
    const input = lastInput();
    expect(input.placeId).toBeUndefined();
    expect(input.facts).toMatchObject({
      startDate: null,
      localStartDate: '2026-11-04',
      localStartTime: null,
      localEndDate: '2026-11-05',
      address: '1 rue X, 75001 Paris',
      latitude: 48.86,
    });
    expect(input.source.images).toEqual([image]);
  });

  it('a category the catalog does not have is not written', async () => {
    const { service, lastInput } = setup();
    await service.upsert(PROVIDER, normalized({ categorySlug: 'music' }));
    expect(lastInput().categorySlug).toBeNull();
  });

  it('a cancelled event: its record is obsolete and the event inactive (deactivated, never deleted)', async () => {
    const { service, lastInput } = setup();
    await service.upsert(PROVIDER, normalized({ isActive: false }));
    expect(lastInput().facts.isActive).toBe(false);
    expect(lastInput().source.obsoleteAt).toEqual(NOW);
  });

  it('timing that cannot be stored without inventing (no start, end before start) → InvalidProviderRecordError', async () => {
    const { service, events } = setup();
    await expect(
      service.upsert(PROVIDER, normalized({ startDate: null, venue: null })),
    ).rejects.toBeInstanceOf(InvalidProviderRecordError);
    await expect(
      service.upsert(
        PROVIDER,
        normalized({ endDate: new Date('2026-10-03T17:00:00Z'), venue: null }),
      ),
    ).rejects.toBeInstanceOf(InvalidProviderRecordError);
    expect(events.upsertFromSource).not.toHaveBeenCalled();
  });

  it('persistence errors pass through', async () => {
    const { service, events } = setup();
    events.upsertFromSource.mockRejectedValue(new DatabaseUnavailableError());
    await expect(service.upsert(PROVIDER, normalized())).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });

  it('importNearby: every event upserted, invalid ones skipped, counts reported; provider errors propagate', async () => {
    const { service, events } = setup();
    events.upsertFromSource
      .mockResolvedValueOnce({ event: { id: 'a' }, outcome: 'created' } as never)
      .mockResolvedValueOnce({ event: { id: 'b' }, outcome: 'unchanged' } as never);
    const provider = {
      identity: PROVIDER,
      searchNearby: vi
        .fn()
        .mockResolvedValueOnce([normalized(), normalized(), normalized({ startDate: null })])
        .mockRejectedValueOnce(new Error('boom')),
      getEvent: vi.fn(),
    } as unknown as EventProvider;
    const query = { latitude: 48.86, longitude: 2.35, radiusMeters: 1000 };

    const report = await service.importNearby(provider, query);
    expect(report).toMatchObject({ created: 1, updated: 0, unchanged: 1, skipped: 1 });
    await expect(service.importNearby(provider, query)).rejects.toThrow('boom');
  });

  it('importEvent: unknown to the provider → null, nothing written', async () => {
    const { service, events } = setup();
    const provider = {
      identity: PROVIDER,
      searchNearby: vi.fn(),
      getEvent: vi.fn().mockResolvedValue(null),
    } as unknown as EventProvider;
    await expect(service.importEvent(provider, 'x')).resolves.toBeNull();
    expect(events.upsertFromSource).not.toHaveBeenCalled();
  });
});
