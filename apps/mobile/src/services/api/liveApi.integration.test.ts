import i18n from '@/i18n';

import { createApiRepositories } from '.';
import { API_ERROR_CODES, isApiError } from './apiError';
import { createMemorySessionStorage } from './sessionStorage';

/**
 * End-to-end check of the mobile API layer against a **running local ROAM API** (DATA-8 validation). Skipped
 * unless `ROAM_API_URL` is set, so the regular suite never needs a backend:
 *
 *   ROAM_API_URL=http://localhost:3000 pnpm --filter @roam/mobile exec jest liveApi
 *
 * Point it at an API started on the **`roam_test`** database with the DATA-1 catalog seeded
 * (`mobiledocs/MOBILE_API_INTEGRATION.md` → "Validation"): it creates an account, a session and a favorite.
 * It never runs against `roam`. Costs 3 requests of the API's `auth` rate-limit tier per run.
 */
const API_URL = process.env.ROAM_API_URL;
const describeLive = API_URL ? describe : describe.skip;

type NodeHttpResponse = {
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  setEncoding(encoding: string): void;
  on(event: 'data', listener: (chunk: string) => void): void;
  on(event: 'end', listener: () => void): void;
};
type NodeHttp = {
  request(
    url: string,
    options: { method: string; headers: Record<string, string> },
    callback: (response: NodeHttpResponse) => void,
  ): {
    on(event: 'error', listener: (error: Error) => void): void;
    destroy(error: Error): void;
    write(body: string): void;
    end(): void;
  };
};

/**
 * Jest runs with Expo's `fetch` polyfill, which does not reach the network in tests: a minimal `fetch` on
 * Node's `http` module is injected instead (the app itself uses React Native's `fetch`).
 */
const nodeFetch = ((input: RequestInfo | URL, init: RequestInit = {}) =>
  new Promise<Response>((resolve, reject) => {
    // Node's own module, only reachable in Jest (the mobile tsconfig has no Node types).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const http = require('node:http') as NodeHttp;
    const request = http.request(
      String(input),
      { method: init.method ?? 'GET', headers: init.headers as Record<string, string> },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => (body += chunk));
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          resolve({
            status,
            ok: status >= 200 && status < 300,
            headers: {
              get: (name: string) => {
                const value = response.headers[name.toLowerCase()];
                return Array.isArray(value) ? value.join(', ') : (value ?? null);
              },
            },
            text: async () => body,
          } as unknown as Response);
        });
      },
    );
    request.on('error', reject);
    init.signal?.addEventListener('abort', () => request.destroy(new Error('Aborted')));
    if (typeof init.body === 'string') request.write(init.body);
    request.end();
  })) as typeof fetch;

const UUID_PATTERN = /^[0-9a-f-]{36}$/;

describeLive('mobile API layer ↔ local ROAM API', () => {
  const sessionStorage = createMemorySessionStorage();
  const repositories = createApiRepositories({
    apiUrl: API_URL ?? '',
    sessionStorage,
    fetchImpl: nodeFetch,
  });
  const email = `data8-${Date.now()}@example.test`;
  const password = 'roam-data8-2026';

  beforeAll(async () => {
    await i18n.changeLanguage('fr');
  });

  it('the catalog needs a session', async () => {
    const error = await repositories.experiences.list().catch((reason: unknown) => reason);
    expect(isApiError(error) && error.code).toBe(API_ERROR_CODES.unauthorized);
  });

  it('register → session kept → restoreSession → current user', async () => {
    await repositories.auth.register({ displayName: 'Data Huit', email, password });
    expect(await sessionStorage.getToken()).toMatch(/.{20,}/);

    await expect(repositories.auth.restoreSession()).resolves.toBe(true);
    await expect(repositories.users.getCurrentUser()).resolves.toMatchObject({
      email,
      displayName: 'Data Huit',
    });
  });

  it('the real catalog maps to the model the screens read', async () => {
    const experiences = await repositories.experiences.list();

    expect(experiences.length).toBeGreaterThan(0);
    for (const experience of experiences) {
      expect(experience.id).toMatch(UUID_PATTERN);
      expect(experience.title).toEqual(expect.any(String));
      expect(experience.moods).toEqual([]);
      expect(experience.categoryIds.length).toBeGreaterThan(0);
      expect(experience.categoryIds.every((id) => id.startsWith('cat-'))).toBe(true);
      // No `undefined` string in a label, no fabricated image.
      for (const label of [experience.durationLabel, experience.priceLabel, experience.location]) {
        expect(label ?? '').not.toContain('undefined');
      }
      expect(experience.coverImage).toBeUndefined();
    }
    // DATA-1 gives every migrated experience a duration and a price bracket.
    expect(
      experiences.every((experience) => experience.durationLabel && experience.priceLabel),
    ).toBe(true);

    const detail = await repositories.experiences.getById(experiences[0].id);
    expect(detail).toMatchObject({ id: experiences[0].id, title: experiences[0].title });

    await expect(
      repositories.experiences.getById('00000000-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('recommendations (API-12): the real catalog, ranked by the API around a Paris position', async () => {
    const catalogIds = new Set((await repositories.experiences.list()).map((item) => item.id));

    const result = await repositories.recommendations.recommend({
      location: { latitude: 48.8566, longitude: 2.3522 },
      maxDistanceKm: 10,
      limit: 4,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(4);
    for (const item of result.items) {
      expect(catalogIds.has(item.experience.id)).toBe(true);
      expect(item.experience.moods).toEqual([]);
      if (item.distanceM !== undefined) expect(item.distanceM).toBeGreaterThanOrEqual(0);
    }
    // Without any context the API still answers (preferences or nothing): never an error.
    await expect(repositories.recommendations.recommend({ limit: 4 })).resolves.toMatchObject({
      items: expect.any(Array),
    });
  });

  it('search and favorites read the same catalog', async () => {
    const [first] = await repositories.experiences.list();
    const results = await repositories.search.search(first.title.slice(0, 6));
    expect(results.map((experience) => experience.id)).toContain(first.id);

    await repositories.favorites.add(first.id);
    await repositories.favorites.add(first.id);
    await expect(repositories.favorites.listExperienceIds()).resolves.toEqual([first.id]);
    await repositories.favorites.remove(first.id);
    await expect(repositories.favorites.listExperienceIds()).resolves.toEqual([]);
  });

  it('a session revoked elsewhere: 401 → session forgotten, expiry reported once', async () => {
    const token = await sessionStorage.getToken();
    const expired = jest.fn();
    const unsubscribe = repositories.auth.onSessionExpired(expired);
    // Another device logs this session out.
    await nodeFetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const error = await repositories.experiences.list().catch((reason: unknown) => reason);

    expect(isApiError(error) && error.code).toBe(API_ERROR_CODES.sessionInvalid);
    expect(expired).toHaveBeenCalledTimes(1);
    await expect(sessionStorage.getToken()).resolves.toBeNull();
    unsubscribe();
  });

  it('login with the wrong password → AUTH_INVALID_CREDENTIALS; right password → signed in; logout', async () => {
    const wrong = await repositories.auth
      .login({ email, password: 'not-the-password1' })
      .catch((reason: unknown) => reason);
    expect(isApiError(wrong) && wrong.code).toBe(API_ERROR_CODES.invalidCredentials);
    expect(await sessionStorage.getToken()).toBeNull();

    await repositories.auth.login({ email, password });
    await expect(repositories.auth.restoreSession()).resolves.toBe(true);

    await repositories.auth.logout();
    expect(await sessionStorage.getToken()).toBeNull();
    await expect(repositories.auth.restoreSession()).resolves.toBe(false);
    // Logging out again (nothing kept, or an already dead token) stays harmless.
    await expect(repositories.auth.logout()).resolves.toBeUndefined();
  });
});
