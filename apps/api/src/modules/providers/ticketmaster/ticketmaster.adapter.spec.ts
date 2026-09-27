import type { Clock } from '../../../common/clock.js';
import {
  ProviderNotFoundError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import type { EventProvider } from '../provider.types.js';
import { geohash } from './geohash.js';
import { TicketmasterAdapter } from './ticketmaster.adapter.js';
import type { TicketmasterClient } from './ticketmaster.client.js';
import type { TicketmasterEventDto } from './ticketmaster.dto.js';

const NOW = new Date('2026-09-27T08:00:00Z');

const EVENT: TicketmasterEventDto = {
  id: 'Zk1',
  name: 'Théâtre Test',
  images: [],
  start: new Date('2026-10-03T18:00:00Z'),
  timezone: 'Europe/Paris',
  classifications: [{ primary: true, segment: { id: 'KZFzniwnSyZfZ7v7na' } }],
  priceRanges: [],
  distanceKm: 0.3,
};

function setup() {
  const client = { searchEvents: vi.fn().mockResolvedValue([]), getEvent: vi.fn() };
  const clock: Clock = { now: () => NOW };
  return {
    client,
    adapter: new TicketmasterAdapter(client as unknown as TicketmasterClient, clock),
  };
}

const QUERY = { latitude: 48.8566, longitude: 2.3522, radiusMeters: 1500 };

describe('TicketmasterAdapter (client mocked)', () => {
  it('is an EventProvider with the stable provider key', () => {
    const provider: EventProvider = setup().adapter;
    expect(provider.identity).toEqual({ key: 'ticketmaster', name: 'Ticketmaster' });
  });

  it('searchNearby: geohash, whole-km radius, from now by default, one page of 20', async () => {
    const { adapter, client } = setup();
    client.searchEvents.mockResolvedValue([EVENT]);

    const events = await adapter.searchNearby(QUERY);

    expect(client.searchEvents).toHaveBeenCalledWith({
      geoPoint: geohash(48.8566, 2.3522),
      radiusKm: 2,
      startDateTime: NOW,
      endDateTime: undefined,
      size: 20,
      segmentIds: undefined,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: 'Théâtre Test',
      categorySlug: 'culture',
      source: { providerKey: 'ticketmaster', externalId: 'Zk1' },
    });
  });

  it('searchNearby: date range, size and categories are translated', async () => {
    const { adapter, client } = setup();
    const from = new Date('2026-10-01T00:00:00Z');
    const to = new Date('2026-10-08T00:00:00Z');

    await adapter.searchNearby({ ...QUERY, from, to, maxResults: 5, categorySlugs: ['culture'] });

    expect(client.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        startDateTime: from,
        endDateTime: to,
        size: 5,
        segmentIds: ['KZFzniwnSyZfZ7v7na'],
      }),
    );
  });

  it('searchNearby: keeps only events really inside the radius (Ticketmaster rounds to whole km)', async () => {
    const { adapter, client } = setup();
    client.searchEvents.mockResolvedValue([
      { ...EVENT, id: 'in', distanceKm: 1.5 },
      { ...EVENT, id: 'out', distanceKm: 1.8 },
      { ...EVENT, id: 'unknown', distanceKm: undefined },
    ]);

    const events = await adapter.searchNearby(QUERY);

    expect(events.map((event) => event.source.externalId)).toEqual(['in']);
  });

  it('searchNearby: several results, in order; an empty result is empty', async () => {
    const { adapter, client } = setup();
    client.searchEvents.mockResolvedValueOnce([EVENT, { ...EVENT, id: 'Zk2' }]);
    client.searchEvents.mockResolvedValueOnce([]);

    expect((await adapter.searchNearby(QUERY)).map((e) => e.source.externalId)).toEqual([
      'Zk1',
      'Zk2',
    ]);
    await expect(adapter.searchNearby(QUERY)).resolves.toEqual([]);
  });

  it('searchNearby: categories Ticketmaster cannot express → no request, no result', async () => {
    const { adapter, client } = setup();
    await expect(adapter.searchNearby({ ...QUERY, categorySlugs: ['cafe'] })).resolves.toEqual([]);
    expect(client.searchEvents).not.toHaveBeenCalled();
  });

  it.each([
    [{ latitude: 91 }, /coordinates/],
    [{ longitude: Number.NaN }, /coordinates/],
    [{ radiusMeters: 0 }, /radius/],
    [{ radiusMeters: 50_001 }, /radius/],
    [{ maxResults: 0 }, /maxResults/],
    [{ maxResults: 51 }, /maxResults/],
    [{ maxResults: 1.5 }, /maxResults/],
    [{ from: new Date('invalid') }, /date range/],
    [{ from: NOW, to: NOW }, /date range/],
    [{ to: new Date('2026-01-01T00:00:00Z') }, /date range/],
  ])('searchNearby: refuses %o before any request', async (override, message) => {
    const { adapter, client } = setup();
    await expect(adapter.searchNearby({ ...QUERY, ...override })).rejects.toThrow(message);
    expect(client.searchEvents).not.toHaveBeenCalled();
  });

  it('getEvent: normalizes the event; unknown → null', async () => {
    const { adapter, client } = setup();
    client.getEvent.mockResolvedValueOnce(EVENT);
    client.getEvent.mockRejectedValueOnce(
      new ProviderNotFoundError('ticketmaster', 'getEvent', 'HTTP 404'),
    );

    await expect(adapter.getEvent('Zk1')).resolves.toMatchObject({ title: 'Théâtre Test' });
    await expect(adapter.getEvent('gone')).resolves.toBeNull();
  });

  it.each([
    new ProviderRateLimitError('ticketmaster', 'searchEvents', 'HTTP 429'),
    new ProviderUnavailableError('ticketmaster', 'searchEvents', 'HTTP 503', 503),
  ])('provider errors pass through typed (%o)', async (error) => {
    const { adapter, client } = setup();
    client.searchEvents.mockRejectedValue(error);
    client.getEvent.mockRejectedValue(error);
    await expect(adapter.searchNearby(QUERY)).rejects.toBe(error);
    await expect(adapter.getEvent('x')).rejects.toBe(error);
  });
});
