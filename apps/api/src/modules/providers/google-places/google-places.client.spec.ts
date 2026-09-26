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
import {
  DETAILS_FIELD_MASK,
  GooglePlacesClient,
  NEARBY_FIELD_MASK,
} from './google-places.client.js';

/** A fictional key: tests never hold a real one and never call Google. */
const KEY = 'AIzaFAKE-test-key_000000000000000000000';

const PLACE = {
  id: 'ChIJ-fake-place',
  displayName: { text: 'Café Test', languageCode: 'fr' },
  location: { latitude: 48.8566, longitude: 2.3522 },
};

function clientWith(apiKey: string | null = KEY) {
  const config = {
    providers: { googlePlacesApiKey: apiKey ?? undefined },
  } as unknown as AppConfigService;
  return new GooglePlacesClient(config);
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const NEARBY = { latitude: 48.8566, longitude: 2.3522, radiusMeters: 500, maxResultCount: 5 };

describe('GooglePlacesClient (Google mocked)', () => {
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

  it('searchNearby: POST with the key header, the explicit field mask and a circle restriction', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { places: [PLACE] }));

    const places = await clientWith().searchNearby({ ...NEARBY, includedTypes: ['cafe'] });

    expect(places).toEqual([{ ...PLACE, displayName: { text: 'Café Test', languageCode: 'fr' } }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': NEARBY_FIELD_MASK,
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual({
      locationRestriction: {
        circle: { center: { latitude: 48.8566, longitude: 2.3522 }, radius: 500 },
      },
      maxResultCount: 5,
      includedTypes: ['cafe'],
      languageCode: 'fr',
      regionCode: 'FR',
    });
  });

  it('field masks are explicit: never "*", Nearby fields under "places.", nothing costly requested', () => {
    for (const mask of [NEARBY_FIELD_MASK, DETAILS_FIELD_MASK]) {
      expect(mask).not.toContain('*');
      expect(mask).not.toMatch(/\s/);
      for (const costly of ['photos', 'reviews', 'OpeningHours', 'websiteUri', 'editorialSummary'])
        expect(mask).not.toContain(costly);
    }
    expect(NEARBY_FIELD_MASK.split(',').every((field) => field.startsWith('places.'))).toBe(true);
    expect(DETAILS_FIELD_MASK.split(',')).toContain('id');
  });

  it('searchNearby: no "places" in the body means no result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await expect(clientWith().searchNearby(NEARBY)).resolves.toEqual([]);
  });

  it('searchNearby: drops invalid places (no id, no name, bad coordinates), keeps the valid ones', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        places: [
          PLACE,
          { ...PLACE, id: undefined },
          { ...PLACE, displayName: undefined },
          { ...PLACE, location: { latitude: 120, longitude: 2 } },
        ],
      }),
    );
    await expect(clientWith().searchNearby(NEARBY)).resolves.toHaveLength(1);
  });

  it('getPlace: GET /places/{id} with the details field mask, language and region', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, PLACE));

    await expect(clientWith().getPlace('ChIJ/weird id')).resolves.toMatchObject({
      id: PLACE.id,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://places.googleapis.com/v1/places/ChIJ%2Fweird%20id?languageCode=fr&regionCode=FR',
    );
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ 'X-Goog-FieldMask': DETAILS_FIELD_MASK });
  });

  it('no API key: configuration error, no request sent', async () => {
    const client = clientWith(null);
    await expect(client.searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderConfigurationError);
    await expect(client.getPlace('x')).rejects.toBeInstanceOf(ProviderConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('timeout: ProviderTimeoutError', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(clientWith().searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it('network failure: ProviderUnavailableError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(clientWith().getPlace('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  const googleError = (code: number, status: string, details?: unknown[]) => ({
    error: { code, status, message: 'Google says no', ...(details ? { details } : {}) },
  });

  it.each([
    [400, 'INVALID_ARGUMENT', ProviderRequestError],
    [401, 'UNAUTHENTICATED', ProviderAuthenticationError],
    [403, 'PERMISSION_DENIED', ProviderAuthenticationError],
    [404, 'NOT_FOUND', ProviderNotFoundError],
    [429, 'RESOURCE_EXHAUSTED', ProviderRateLimitError],
    [500, 'INTERNAL', ProviderUnavailableError],
    [503, 'UNAVAILABLE', ProviderUnavailableError],
  ])('HTTP %i %s → %o', async (status, googleStatus, errorClass) => {
    fetchMock.mockResolvedValue(jsonResponse(status, googleError(status, googleStatus)));

    const error: unknown = await clientWith()
      .getPlace('x')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(errorClass);
    expect((error as Error).message).toBe(`google_places getPlace: HTTP ${status} ${googleStatus}`);
    expect((error as Error).message).not.toContain('Google says no');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an invalid key (400 with reason API_KEY_INVALID) is an authentication error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        400,
        googleError(400, 'INVALID_ARGUMENT', [
          { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' },
        ]),
      ),
    );
    const error: unknown = await clientWith()
      .searchNearby(NEARBY)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderAuthenticationError);
    expect((error as Error).message).toBe(
      'google_places searchNearby: HTTP 400 INVALID_ARGUMENT (API_KEY_INVALID)',
    );
  });

  it('keeps the Google reason code, never Google metadata (project, service…)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        403,
        googleError(403, 'PERMISSION_DENIED', [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'SERVICE_DISABLED',
            metadata: { consumer: 'projects/123456', service: 'places.googleapis.com' },
          },
        ]),
      ),
    );
    const error = (await clientWith()
      .getPlace('x')
      .catch((e: unknown) => e)) as Error;
    expect(error).toBeInstanceOf(ProviderAuthenticationError);
    expect(error.message).toBe(
      'google_places getPlace: HTTP 403 PERMISSION_DENIED (SERVICE_DISABLED)',
    );
    expect(error.message).not.toContain('123456');
  });

  it('429: no retry, Retry-After kept for the caller', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, googleError(429, 'RESOURCE_EXHAUSTED'), { 'Retry-After': '30' }),
    );

    const error = (await clientWith()
      .searchNearby(NEARBY)
      .catch((e: unknown) => e)) as ProviderRateLimitError;

    expect(error).toBeInstanceOf(ProviderRateLimitError);
    expect(error.retryAfterSeconds).toBe(30);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an error body that is not JSON still gives a typed error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(clientWith().getPlace('x')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it.each([
    ['not JSON', new Response('not json', { status: 200 })],
    ['"places" not a list', jsonResponse(200, { places: 'nope' })],
    ['a list instead of an object', jsonResponse(200, [PLACE])],
  ])('invalid success response (%s): ProviderResponseError', async (_label, response) => {
    fetchMock.mockResolvedValue(response);
    await expect(clientWith().searchNearby(NEARBY)).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('getPlace: a place without its required fields is an invalid response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'x' }));
    await expect(clientWith().getPlace('x')).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('logs operation, duration and outcome — never the key, a header or the payload', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { places: [PLACE] }))
      .mockResolvedValueOnce(jsonResponse(429, googleError(429, 'RESOURCE_EXHAUSTED')));
    const client = clientWith();

    await client.searchNearby(NEARBY);
    await client.searchNearby(NEARBY).catch(() => undefined);

    expect(logs.some((line) => /searchNearby ok in \d+ ms: 1 places/.test(line))).toBe(true);
    expect(logs.some((line) => line.includes('ProviderRateLimitError'))).toBe(true);
    const all = logs.join('\n');
    for (const secret of [KEY, 'X-Goog-Api-Key', 'Café Test', PLACE.id, 'Google says no'])
      expect(all).not.toContain(secret);
  });
});
