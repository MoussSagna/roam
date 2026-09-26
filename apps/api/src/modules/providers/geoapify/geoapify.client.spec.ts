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
import { GeoapifyClient } from './geoapify.client.js';

/** A fictional key: tests never hold a real one and never call Geoapify. */
const KEY = 'geoFAKE0test0key00000000000000000';

/** A Geoapify-like feature (shape observed on the real API, trimmed). */
const FEATURE = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [2.3509612, 48.8600106] },
  properties: {
    name: 'Café Test',
    city: 'Paris',
    lat: 48.8600106,
    lon: 2.3509612,
    formatted: 'Café Test, 43 Rue Saint-Merri, 75004 Paris, France',
    address_line1: 'Café Test',
    address_line2: '43 Rue Saint-Merri, 75004 Paris, France',
    categories: ['catering', 'catering.cafe'],
    datasource: {
      sourcename: 'openstreetmap',
      url: 'https://www.openstreetmap.org/copyright',
      raw: { osm_type: 'n', osm_id: 2152981900, name: 'Café Test' },
    },
    place_id: '51bf51e1bec4ce0240594f9bccd3146e4840f00103f9018ce5538000',
  },
};

const collection = (features: unknown[]) => ({ type: 'FeatureCollection', features });

function clientWith(apiKey: string | null = KEY) {
  const config = {
    providers: { geoapifyApiKey: apiKey ?? undefined },
  } as unknown as AppConfigService;
  return new GeoapifyClient(config);
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const NEARBY = {
  latitude: 48.8566,
  longitude: 2.3522,
  radiusMeters: 500,
  limit: 5,
  categories: ['catering.cafe'],
};

const EXPECTED = {
  osmType: 'node',
  osmId: '2152981900',
  name: 'Café Test',
  lat: 48.8600106,
  lon: 2.3509612,
  formatted: 'Café Test, 43 Rue Saint-Merri, 75004 Paris, France',
  addressLine1: 'Café Test',
  addressLine2: '43 Rue Saint-Merri, 75004 Paris, France',
  city: 'Paris',
  categories: ['catering', 'catering.cafe'],
};

describe('GeoapifyClient (Geoapify mocked)', () => {
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

  it('searchNearby: GET /v2/places with categories, a lon-first circle, limit, lang; key in a header', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, collection([FEATURE])));

    const places = await clientWith().searchNearby({
      ...NEARBY,
      categories: ['catering.cafe', 'catering.bar'],
    });

    expect(places).toEqual([EXPECTED]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://api.geoapify.com/v2/places');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      categories: 'catering.cafe,catering.bar',
      filter: 'circle:2.3522,48.8566,500',
      limit: '5',
      lang: 'fr',
    });
    // Never in the URL: it ends up in proxy and error logs.
    expect(url).not.toContain(KEY);
    expect(url.toLowerCase()).not.toContain('apikey');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ 'X-Api-Key': KEY });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('searchNearby: an empty collection means no result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, collection([])));
    await expect(clientWith().searchNearby(NEARBY)).resolves.toEqual([]);
  });

  it('searchNearby: several places, invalid ones dropped (no OSM identity, no name, bad coordinates)', async () => {
    const withProps = (properties: Record<string, unknown>) => ({
      ...FEATURE,
      properties: { ...FEATURE.properties, ...properties },
    });
    fetchMock.mockResolvedValue(
      jsonResponse(
        200,
        collection([
          FEATURE,
          withProps({
            name: 'Parc Test',
            datasource: { raw: { osm_type: 'w', osm_id: '42' } },
          }),
          withProps({ datasource: { sourcename: 'other', raw: {} } }),
          withProps({ datasource: undefined }),
          withProps({ datasource: { raw: { osm_type: 'x', osm_id: 1 } } }),
          withProps({ datasource: { raw: { osm_type: 'toString', osm_id: 1 } } }),
          withProps({ name: undefined }),
          withProps({ name: '  ' }),
          withProps({ lat: 120 }),
          withProps({ lon: 'east' }),
          'not a feature',
        ]),
      ),
    );

    const places = await clientWith().searchNearby(NEARBY);

    expect(places.map((place) => [place.osmType, place.osmId, place.name])).toEqual([
      ['node', '2152981900', 'Café Test'],
      ['way', '42', 'Parc Test'],
    ]);
    expect(logs.some((line) => line.includes('2 places, 9 skipped (invalid)'))).toBe(true);
  });

  it('optional fields of the wrong type are dropped, never guessed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        200,
        collection([
          {
            ...FEATURE,
            properties: {
              ...FEATURE.properties,
              city: 75,
              formatted: null,
              address_line1: undefined,
              address_line2: {},
              categories: 'catering.cafe',
            },
          },
        ]),
      ),
    );
    const [place] = await clientWith().searchNearby(NEARBY);
    expect(place).toEqual({
      osmType: 'node',
      osmId: '2152981900',
      name: 'Café Test',
      lat: 48.8600106,
      lon: 2.3509612,
      formatted: undefined,
      addressLine1: undefined,
      addressLine2: undefined,
      city: undefined,
      categories: undefined,
    });
  });

  it('getPlace: GET /v2/place-details by OpenStreetMap object, details only', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        200,
        collection([
          { ...FEATURE, properties: { ...FEATURE.properties, feature_type: 'details' } },
        ]),
      ),
    );

    await expect(clientWith().getPlace('node', '2152981900')).resolves.toEqual(EXPECTED);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://api.geoapify.com/v2/place-details');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      osm_type: 'n',
      osm_id: '2152981900',
      features: 'details',
      lang: 'fr',
    });
    expect(init.headers).toEqual({ 'X-Api-Key': KEY });
  });

  it('getPlace: an unknown place (200, no feature) is null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, collection([])));
    await expect(clientWith().getPlace('way', '1')).resolves.toBeNull();
  });

  it('getPlace: a feature without its required fields is an invalid response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, collection([{ properties: { name: 'x' } }])));
    await expect(clientWith().getPlace('node', '1')).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('no API key: configuration error, no request sent', async () => {
    const client = clientWith(null);
    await expect(client.searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderConfigurationError);
    await expect(client.getPlace('node', '1')).rejects.toBeInstanceOf(ProviderConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('timeout: ProviderTimeoutError', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(clientWith().searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it('network failure: ProviderUnavailableError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(clientWith().getPlace('node', '1')).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  /** Geoapify's error body; `message` may echo the request (here: a fake secret) and must never be kept. */
  const geoapifyError = (statusCode: number, error: string) => ({
    statusCode,
    error,
    message: 'Invalid apiKey geoFAKE-echoed',
  });

  it.each([
    [400, 'Bad Request', ProviderRequestError],
    [401, 'Unauthorized', ProviderAuthenticationError],
    [403, 'Forbidden', ProviderAuthenticationError],
    [404, 'Not Found', ProviderNotFoundError],
    [429, 'Too Many Requests', ProviderRateLimitError],
    [500, 'Internal Server Error', ProviderUnavailableError],
    [503, 'Service Unavailable', ProviderUnavailableError],
  ])('HTTP %i %s → %o', async (status, name, errorClass) => {
    fetchMock.mockResolvedValue(jsonResponse(status, geoapifyError(status, name)));

    const error: unknown = await clientWith()
      .searchNearby(NEARBY)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(errorClass);
    expect((error as Error).message).toBe(`geoapify searchNearby: HTTP ${status} ${name}`);
    expect((error as Error).message).not.toContain('echoed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429: no retry, Retry-After kept for the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, geoapifyError(429, 'Too Many Requests'), { 'Retry-After': '10' }),
    );

    const error = (await clientWith()
      .searchNearby(NEARBY)
      .catch((e: unknown) => e)) as ProviderRateLimitError;

    expect(error).toBeInstanceOf(ProviderRateLimitError);
    expect(error.retryAfterSeconds).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an error body that is not JSON (or an odd error name) still gives a typed error, status only', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'key=geoFAKE <script>' }));

    const gateway = (await clientWith()
      .getPlace('node', '1')
      .catch((e: unknown) => e)) as Error;
    const odd = (await clientWith()
      .getPlace('node', '1')
      .catch((e: unknown) => e)) as Error;

    expect(gateway).toBeInstanceOf(ProviderUnavailableError);
    expect(gateway.message).toBe('geoapify getPlace: HTTP 502');
    expect(odd).toBeInstanceOf(ProviderRequestError);
    expect(odd.message).toBe('geoapify getPlace: HTTP 400');
  });

  it.each([
    ['not JSON', () => new Response('not json', { status: 200 })],
    ['not a FeatureCollection', () => jsonResponse(200, { type: 'Feature', features: [] })],
    ['"features" not a list', () => jsonResponse(200, { type: 'FeatureCollection' })],
    ['a list instead of an object', () => jsonResponse(200, [FEATURE])],
  ])('invalid success response (%s): ProviderResponseError', async (_label, response) => {
    fetchMock.mockResolvedValue(response());
    await expect(clientWith().searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('logs operation, duration and outcome — never the key, a header or the payload', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, collection([FEATURE])))
      .mockResolvedValueOnce(jsonResponse(401, geoapifyError(401, 'Unauthorized')));
    const client = clientWith();

    await client.searchNearby(NEARBY);
    await client.searchNearby(NEARBY).catch(() => undefined);

    expect(logs.some((line) => /searchNearby ok in \d+ ms: 1 places/.test(line))).toBe(true);
    expect(logs.some((line) => line.includes('ProviderAuthenticationError'))).toBe(true);
    const all = logs.join('\n');
    for (const secret of [KEY, 'X-Api-Key', 'Café Test', '2152981900', 'Rue Saint-Merri', 'echoed'])
      expect(all).not.toContain(secret);
  });
});
