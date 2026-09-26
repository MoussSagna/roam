import { apiError, createFakeFetch, ok } from '@/test/fakeFetch';

import { createApiClient } from './apiClient';
import { ApiError, CLIENT_ERROR_CODES, errorMessageKey, isApiError } from './apiError';
import { createMemorySessionStorage } from './sessionStorage';

const BASE_URL = 'http://api.test';
const TOKEN = 'secret-session-token';

function setup(
  handler: Parameters<typeof createFakeFetch>[0],
  { token = TOKEN as string | null, timeoutMs = 1000 } = {},
) {
  const { fetchImpl, requests } = createFakeFetch(handler);
  const sessionStorage = createMemorySessionStorage(token);
  const onUnauthorized = jest.fn();
  const client = createApiClient({
    baseUrl: BASE_URL,
    sessionStorage,
    onUnauthorized,
    timeoutMs,
    fetchImpl,
  });
  return { client, requests, sessionStorage, onUnauthorized, fetchImpl };
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

describe('createApiClient', () => {
  describe('successes', () => {
    it('GET 200: prefixes /api/v1, sends the bearer token and returns the envelope data', async () => {
      const { client, requests } = setup(() => ok({ id: 'a' }));

      await expect(client.get('/experiences/a')).resolves.toEqual({ id: 'a' });

      expect(requests[0].url).toBe('http://api.test/api/v1/experiences/a');
      expect(requests[0].method).toBe('GET');
      expect(requests[0].headers).toMatchObject({
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      });
      expect(requests[0].headers['Content-Type']).toBeUndefined();
    });

    it('encodes the query string and leaves out empty values', async () => {
      const { client, requests } = setup(() => ok({ items: [], nextCursor: null }));

      await client.get('/experiences', {
        query: { q: 'café & bar', limit: 20, cursor: null, category: undefined, budget: '' },
      });

      expect(requests[0].url).toBe(
        'http://api.test/api/v1/experiences?q=caf%C3%A9%20%26%20bar&limit=20',
      );
    });

    it('POST: sends a JSON body; public routes go without the token', async () => {
      const { client, requests } = setup(() => ok({ user: {}, session: {} }, 201));

      await client.post(
        '/auth/login',
        { email: 'a@b.c', password: 'pw' },
        { authenticated: false },
      );

      expect(requests[0].method).toBe('POST');
      expect(requests[0].body).toEqual({ email: 'a@b.c', password: 'pw' });
      expect(requests[0].headers['Content-Type']).toBe('application/json');
      expect(requests[0].headers.Authorization).toBeUndefined();
    });

    it('PATCH and DELETE use their methods', async () => {
      const { client, requests } = setup((request) =>
        request.method === 'DELETE' ? { status: 204 } : ok({ displayName: 'Léa' }),
      );

      await client.patch('/users/me', { displayName: 'Léa' });
      await client.delete('/favorites/x');

      expect(requests.map((request) => request.method)).toEqual(['PATCH', 'DELETE']);
    });

    it('204: resolves with nothing', async () => {
      const { client } = setup(() => ({ status: 204 }));
      await expect(client.post('/auth/logout')).resolves.toBeUndefined();
    });

    it('a null data is returned as null (e.g. 202 { data: null })', async () => {
      const { client } = setup(() => ok(null, 202));
      await expect(client.post('/auth/password/forgot', { email: 'a@b.c' })).resolves.toBeNull();
    });

    it('sends no Authorization header when no session is stored', async () => {
      const { client, requests } = setup(() => ok([]), { token: null });
      await client.get('/experiences');
      expect(requests[0].headers.Authorization).toBeUndefined();
    });
  });

  describe('API errors → ApiError', () => {
    it.each([
      [400, 'VALIDATION_ERROR'],
      [404, 'NOT_FOUND'],
      [409, 'AUTH_EMAIL_ALREADY_EXISTS'],
      [422, 'FAVORITE_EXPERIENCE_INACTIVE'],
      [500, 'INTERNAL_SERVER_ERROR'],
      [503, 'DATABASE_UNAVAILABLE'],
    ])('%i %s keeps the status, code, message and details', async (status, code) => {
      const { client, onUnauthorized } = setup(() => ({
        status,
        body: { error: { code, message: 'Readable message.', details: { field: 'x' } } },
      }));

      const error = await caught(client.get('/anything'));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status,
        code,
        message: 'Readable message.',
        details: { field: 'x' },
        retryAfterSeconds: undefined,
      });
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('401 with a session: forgets the token, reports it once, never replays the request', async () => {
      const { client, requests, sessionStorage, onUnauthorized } = setup(() =>
        apiError(401, 'AUTH_SESSION_INVALID'),
      );

      const error = await caught(client.get('/auth/me'));

      expect(error).toMatchObject({ status: 401, code: 'AUTH_SESSION_INVALID' });
      expect(error.isUnauthorized).toBe(true);
      expect(requests).toHaveLength(1);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      await expect(sessionStorage.getToken()).resolves.toBeNull();

      // The next request goes out without the refused token: no loop.
      await caught(client.get('/auth/me'));
      expect(requests[1].headers.Authorization).toBeUndefined();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('401 without a session (wrong password on login) is not a session expiry', async () => {
      const { client, onUnauthorized, sessionStorage } = setup(() =>
        apiError(401, 'AUTH_INVALID_CREDENTIALS'),
      );

      const error = await caught(
        client.post('/auth/login', { email: 'a@b.c', password: 'x' }, { authenticated: false }),
      );

      expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(onUnauthorized).not.toHaveBeenCalled();
      await expect(sessionStorage.getToken()).resolves.toBe(TOKEN);
    });

    it('429: typed, with Retry-After in seconds, and never retried', async () => {
      const { client, requests } = setup(() =>
        apiError(429, 'TOO_MANY_REQUESTS', 'Too many requests: try again later.', {
          headers: { 'Retry-After': '60' },
        }),
      );

      const error = await caught(client.get('/recommendations'));

      expect(error).toMatchObject({
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        retryAfterSeconds: 60,
      });
      expect(error.isRateLimited).toBe(true);
      expect(requests).toHaveLength(1);
      expect(errorMessageKey(error)).toBe('errors.tooManyRequests');
    });

    it('429 without the header: reads details.retryAfterSeconds', async () => {
      const { client } = setup(() => ({
        status: 429,
        body: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Slow down.',
            details: { retryAfterSeconds: 42 },
          },
        },
      }));

      expect((await caught(client.get('/x'))).retryAfterSeconds).toBe(42);
    });
  });

  describe('transport failures → ApiError', () => {
    it('malformed JSON is INVALID_RESPONSE', async () => {
      const { client } = setup(() => ({ status: 200, body: '{"data": ' }));
      expect(await caught(client.get('/x'))).toMatchObject({
        status: 200,
        code: CLIENT_ERROR_CODES.invalidResponse,
      });
    });

    it('a success without the { data } envelope is INVALID_RESPONSE', async () => {
      const { client } = setup(() => ({ status: 200, body: { items: [] } }));
      expect((await caught(client.get('/x'))).code).toBe(CLIENT_ERROR_CODES.invalidResponse);
    });

    it('an error page that is not the { error } envelope (proxy 502 HTML) is INVALID_RESPONSE', async () => {
      const { client } = setup(() => ({ status: 502, body: '<html>Bad gateway</html>' }));
      expect(await caught(client.get('/x'))).toMatchObject({
        status: 502,
        code: CLIENT_ERROR_CODES.invalidResponse,
      });
    });

    it('network unavailable is NETWORK_ERROR (status 0)', async () => {
      const { client } = setup(() => {
        throw new TypeError('Network request failed');
      });

      const error = await caught(client.get('/x'));

      expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.network });
      expect(error.isNetworkError).toBe(true);
      expect(errorMessageKey(error)).toBe('errors.network');
    });

    it('no answer within the timeout is TIMEOUT, and the request is aborted', async () => {
      jest.useFakeTimers();
      let signal: AbortSignal | undefined;
      const fetchImpl = jest.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = init?.signal ?? undefined;
            signal?.addEventListener('abort', () => reject(new Error('Aborted')));
          }),
      ) as unknown as typeof fetch;
      const client = createApiClient({
        baseUrl: BASE_URL,
        sessionStorage: createMemorySessionStorage(null),
        timeoutMs: 5000,
        fetchImpl,
      });

      const pending = caught(client.get('/slow'));
      await jest.advanceTimersByTimeAsync(5000);
      const error = await pending;

      expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.timeout });
      expect(signal?.aborted).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('privacy', () => {
    it('never puts the token, the URL or the body in an error', async () => {
      const handlers = [
        () => apiError(401, 'AUTH_SESSION_INVALID'),
        () => {
          throw new TypeError(`failed ${BASE_URL}`);
        },
        () => ({ status: 500, body: 'oops' }),
      ];
      for (const handler of handlers) {
        const { client } = setup(handler);
        const error = await caught(client.post('/auth/login', { password: 'hunter2' }));
        const serialized = JSON.stringify({ ...error, message: error.message });
        expect(serialized).not.toContain(TOKEN);
        expect(serialized).not.toContain('hunter2');
        expect(serialized).not.toContain(BASE_URL);
      }
    });
  });
});

describe('errorMessageKey', () => {
  it('falls back to the generic message for anything that is not an API failure', () => {
    expect(errorMessageKey(new Error('boom'))).toBe('errors.generic');
    expect(
      errorMessageKey(new ApiError({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: '' })),
    ).toBe('errors.generic');
    expect(
      errorMessageKey(new ApiError({ status: 401, code: 'AUTH_SESSION_INVALID', message: '' })),
    ).toBe('errors.sessionExpired');
  });
});
