import { Logger } from '@nestjs/common';

import type { AppConfigService } from '../../../config/app-config.service.js';
import {
  ProviderAuthenticationError,
  ProviderConfigurationError,
  ProviderNotFoundError,
  ProviderRateLimitError,
  ProviderRequestError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import { TicketmasterClient, ticketmasterDateTime } from './ticketmaster.client.js';

/** A fictional key: tests never hold a real one and never call Ticketmaster. */
const KEY = 'tmFAKE0test0key00000000000000000';

/** A Ticketmaster-like event (shape observed on the real API, trimmed). */
const EVENT = {
  name: 'Spectacle Test',
  type: 'event',
  id: 'ZkTEST0000001',
  test: false,
  url: 'https://www.ticketmaster.fr/fr/manifestation/test/idmanif/1',
  images: [{ ratio: '16_9', url: 'https://s1.ticketm.net/test.jpg', width: 2048, fallback: true }],
  distance: 0.4,
  units: 'KILOMETERS',
  dates: {
    start: { localDate: '2026-10-03', localTime: '20:00:00', dateTime: '2026-10-03T18:00:00Z' },
    timezone: 'Europe/Paris',
    status: { code: 'onsale' },
  },
  classifications: [
    { primary: true, segment: { id: 'KZFzniwnSyZfZ7v7na', name: 'Arts & Theatre' } },
  ],
  _embedded: {
    venues: [
      {
        id: 'rZTESTvenue',
        name: 'Salle Test',
        city: { name: 'Paris' },
        location: { longitude: '2.357117', latitude: '48.857799' },
      },
    ],
  },
};

const search = (events: unknown[] | undefined) => ({
  ...(events ? { _embedded: { events } } : {}),
  page: { size: 20, totalElements: events?.length ?? 0, totalPages: 1, number: 0 },
});

function clientWith(apiKey: string | null = KEY) {
  const config = {
    providers: { ticketmasterApiKey: apiKey ?? undefined },
  } as unknown as AppConfigService;
  return new TicketmasterClient(config);
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const REQUEST = {
  geoPoint: 'u09tvw0f6',
  radiusKm: 2,
  startDateTime: new Date('2026-09-27T08:15:30.123Z'),
  size: 5,
};

describe('TicketmasterClient (Ticketmaster mocked)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let logs: string[];

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    logs = [];
    for (const level of ['log', 'debug', 'warn', 'error', 'verbose'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('searchEvents: GET /events.json with geoPoint, whole-km radius, UTC dates, one page; key as apikey', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, search([EVENT])));

    const events = await clientWith().searchEvents({
      ...REQUEST,
      endDateTime: new Date('2026-10-01T00:00:00Z'),
      segmentIds: ['KZFzniwnSyZfZ7v7na'],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'ZkTEST0000001',
      name: 'Spectacle Test',
      start: new Date('2026-10-03T18:00:00Z'),
      timezone: 'Europe/Paris',
      statusCode: 'onsale',
      distanceKm: 0.4,
      venue: { id: 'rZTESTvenue', location: { latitude: 48.857799, longitude: 2.357117 } },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://app.ticketmaster.com/discovery/v2/events.json',
    );
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      geoPoint: 'u09tvw0f6',
      radius: '2',
      unit: 'km',
      startDateTime: '2026-09-27T08:15:30Z',
      endDateTime: '2026-10-01T00:00:00Z',
      segmentId: 'KZFzniwnSyZfZ7v7na',
      size: '5',
      page: '0',
      sort: 'date,asc',
      locale: '*',
      apikey: KEY,
    });
    expect(init.method).toBe('GET');
    expect(JSON.stringify(init.headers)).not.toContain(KEY);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('ticketmasterDateTime: UTC, no milliseconds', () => {
    expect(ticketmasterDateTime(new Date('2026-12-31T23:59:59.999Z'))).toBe('2026-12-31T23:59:59Z');
  });

  it('searchEvents: no "_embedded" means no result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, search(undefined)));
    await expect(clientWith().searchEvents(REQUEST)).resolves.toEqual([]);
  });

  it('searchEvents: drops invalid events (no id, no name, test, date to be announced, zone-less time)', async () => {
    const start = (value: Record<string, unknown>) => ({
      ...EVENT,
      dates: { ...EVENT.dates, start: value },
    });
    fetchMock.mockResolvedValue(
      jsonResponse(
        200,
        search([
          EVENT,
          { ...EVENT, id: undefined },
          { ...EVENT, name: '  ' },
          { ...EVENT, test: true },
          start({ localDate: '2026-10-03', dateTBA: true, timeTBA: true }),
          start({ localDate: '2026-10-03', noSpecificTime: true }),
          start({ dateTime: '2026-10-03T20:00:00' }),
          start({ dateTime: 'soon' }),
          'not an event',
        ]),
      ),
    );

    await expect(clientWith().searchEvents(REQUEST)).resolves.toHaveLength(1);
    expect(logs.some((line) => line.includes('1 events, 8 skipped'))).toBe(true);
  });

  it('getEvent: GET /events/{id}.json, id encoded', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, EVENT));

    await expect(clientWith().getEvent('Zk/weird id')).resolves.toMatchObject({ id: EVENT.id });
    const parsed = new URL((fetchMock.mock.calls[0] as [string])[0]);
    expect(parsed.pathname).toBe('/discovery/v2/events/Zk%2Fweird%20id.json');
    expect(parsed.searchParams.get('locale')).toBe('*');
  });

  it('getEvent: an event without its required fields is an invalid response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'x' }));
    await expect(clientWith().getEvent('x')).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('no API key: configuration error, no request sent', async () => {
    const client = clientWith(null);
    await expect(client.searchEvents(REQUEST)).rejects.toBeInstanceOf(ProviderConfigurationError);
    await expect(client.getEvent('x')).rejects.toBeInstanceOf(ProviderConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('timeout: ProviderTimeoutError', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(clientWith().searchEvents(REQUEST)).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it('network failure: ProviderUnavailableError, without the URL (it holds the key)', async () => {
    fetchMock.mockRejectedValue(new TypeError(`fetch failed for ...?apikey=${KEY}`));
    const error = (await clientWith()
      .getEvent('x')
      .catch((e: unknown) => e)) as Error;
    expect(error).toBeInstanceOf(ProviderUnavailableError);
    expect(error.message).not.toContain(KEY);
  });

  const apiError = (code: string, status: number) => ({
    errors: [
      { code, detail: `Resource not found (apikey=${KEY}, id=secret-id)`, status: `${status}` },
    ],
  });
  const fault = (errorcode: string) => ({
    fault: { faultstring: `Invalid ApiKey ${KEY}`, detail: { errorcode } },
  });

  it.each([
    [400, apiError('DIS1036', 400), ProviderRequestError, 'HTTP 400 (DIS1036)'],
    [
      401,
      fault('oauth.v2.InvalidApiKey'),
      ProviderAuthenticationError,
      'HTTP 401 (oauth.v2.InvalidApiKey)',
    ],
    [403, {}, ProviderAuthenticationError, 'HTTP 403'],
    [404, apiError('DIS1004', 404), ProviderNotFoundError, 'HTTP 404 (DIS1004)'],
    [
      429,
      fault('policies.ratelimit.SpikeArrestViolation'),
      ProviderRateLimitError,
      'HTTP 429 (policies.ratelimit.SpikeArrestViolation)',
    ],
    [500, {}, ProviderUnavailableError, 'HTTP 500'],
    [503, {}, ProviderUnavailableError, 'HTTP 503'],
  ])('HTTP %i → %o', async (status, body, errorClass, detail) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body));

    const error = (await clientWith()
      .getEvent('x')
      .catch((e: unknown) => e)) as Error;

    expect(error).toBeInstanceOf(errorClass);
    expect(error.message).toBe(`ticketmaster getEvent: ${detail}`);
    expect(error.message).not.toContain(KEY);
    expect(error.message).not.toContain('secret-id');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429: no retry, Retry-After kept for the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, fault('policies.ratelimit.QuotaViolation'), { 'Retry-After': '2' }),
    );
    const error = (await clientWith()
      .searchEvents(REQUEST)
      .catch((e: unknown) => e)) as ProviderRateLimitError;
    expect(error).toBeInstanceOf(ProviderRateLimitError);
    expect(error.retryAfterSeconds).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an error body that is not JSON still gives a typed error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(clientWith().getEvent('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it.each([
    ['not JSON', () => new Response('not json', { status: 200 })],
    ['no page', () => jsonResponse(200, { _embedded: { events: [] } })],
    ['"events" not a list', () => jsonResponse(200, { _embedded: { events: {} }, page: {} })],
    ['a list instead of an object', () => jsonResponse(200, [EVENT])],
  ])('invalid success response (%s): ProviderResponseError', async (_label, response) => {
    fetchMock.mockResolvedValue(response());
    await expect(clientWith().searchEvents(REQUEST)).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('logs operation, duration, count and quota — never the key, the URL or the payload', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, search([EVENT]), { 'Rate-Limit-Available': '4990' }))
      .mockResolvedValueOnce(jsonResponse(401, fault('oauth.v2.InvalidApiKey')));
    const client = clientWith();

    await client.searchEvents(REQUEST);
    await client.searchEvents(REQUEST).catch(() => undefined);

    expect(
      logs.some((line) => /searchEvents ok in \d+ ms: 1 events.*daily quota left 4990/.test(line)),
    ).toBe(true);
    expect(logs.some((line) => line.includes('ProviderAuthenticationError'))).toBe(true);
    const all = logs.join('\n');
    for (const secret of [KEY, 'apikey', 'app.ticketmaster.com', 'Spectacle Test', EVENT.id])
      expect(all).not.toContain(secret);
  });
});
