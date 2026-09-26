import i18n from '@/i18n';
import type { Repositories } from '@/services/repositories/types';
import { apiError, createFakeFetch, ok, type RecordedRequest } from '@/test/fakeFetch';

import { createApiRepositories } from '..';
import { CLIENT_ERROR_CODES, isApiError } from '../apiError';
import type { ExperienceDto } from '../dto';
import { createMemorySessionStorage } from '../sessionStorage';

const API_URL = 'http://api.test';
const TOKEN = 'token-123';

const uuid = (n: number) => `5f0c2d6a-0000-5000-8000-${String(n).padStart(12, '0')}`;

function experienceDto(n: number, overrides: Partial<ExperienceDto> = {}): ExperienceDto {
  return {
    id: uuid(n),
    title: `Experience ${n}`,
    description: null,
    categories: ['bar'],
    city: 'Paris',
    address: null,
    coordinates: null,
    coverImage: null,
    images: [],
    priceLevel: 'free',
    priceMin: 0,
    priceMax: 0,
    currency: 'EUR',
    rating: null,
    reviewCount: null,
    placeIds: [],
    isActive: true,
    roam: null,
    ...overrides,
  };
}

const userDto = {
  id: 'u1',
  email: 'lea@example.com',
  displayName: 'Léa',
  avatarUrl: null,
  age: null,
  city: 'Paris',
  bio: null,
};

function setup(
  handler: (request: RecordedRequest) => ReturnType<Parameters<typeof createFakeFetch>[0]>,
  token: string | null = TOKEN,
) {
  const { fetchImpl, requests } = createFakeFetch(handler);
  const sessionStorage = createMemorySessionStorage(token);
  const repositories: Repositories = createApiRepositories({
    apiUrl: API_URL,
    sessionStorage,
    fetchImpl,
  });
  return { repositories, requests, sessionStorage };
}

const path = (request: RecordedRequest) => request.url.replace(`${API_URL}/api/v1`, '');

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

describe('ApiExperienceRepository', () => {
  it('list(): follows every page and maps each experience', async () => {
    const { repositories, requests } = setup((request) =>
      path(request).includes('cursor=')
        ? ok({ items: [experienceDto(3)], nextCursor: null })
        : ok({ items: [experienceDto(1), experienceDto(2)], nextCursor: uuid(2) }),
    );

    const experiences = await repositories.experiences.list();

    expect(experiences.map((experience) => experience.id)).toEqual([uuid(1), uuid(2), uuid(3)]);
    expect(experiences[0]).toMatchObject({ categoryIds: ['cat-bar'], priceLabel: 'Gratuit' });
    expect(requests.map(path)).toEqual([
      '/experiences?limit=100',
      `/experiences?limit=100&cursor=${uuid(2)}`,
    ]);
  });

  it('list(): screens asking at the same time share one request, and get their own copy', async () => {
    const { repositories, requests } = setup(() =>
      ok({ items: [experienceDto(1)], nextCursor: null }),
    );

    const [home, discover] = await Promise.all([
      repositories.experiences.list(),
      repositories.experiences.list(),
    ]);

    expect(requests).toHaveLength(1);
    home[0].title = 'changed';
    expect(discover[0].title).toBe('Experience 1');

    // Not cached once resolved: the next call reads fresh data.
    await repositories.experiences.list();
    expect(requests).toHaveLength(2);
  });

  it('list(): an empty catalog is an empty list', async () => {
    const { repositories } = setup(() => ok({ items: [], nextCursor: null }));
    await expect(repositories.experiences.list()).resolves.toEqual([]);
  });

  it('list(): a malformed page or a repeated cursor is an error, not a loop', async () => {
    const malformed = setup(() => ok({ experiences: [] }));
    await expect(malformed.repositories.experiences.list()).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.invalidResponse,
    });

    const looping = setup(() => ok({ items: [experienceDto(1)], nextCursor: uuid(9) }));
    await expect(looping.repositories.experiences.list()).rejects.toMatchObject({
      code: CLIENT_ERROR_CODES.invalidResponse,
    });
    expect(looping.requests).toHaveLength(2);
  });

  it('list(): an API error is a real error (no fallback to the mocks)', async () => {
    const { repositories } = setup(() => apiError(503, 'DATABASE_UNAVAILABLE'));
    await expect(repositories.experiences.list()).rejects.toMatchObject({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  });

  it('getById(): reads the detail', async () => {
    const { repositories, requests } = setup(() =>
      ok({ ...experienceDto(4, { title: 'Détail' }), places: [] }),
    );

    await expect(repositories.experiences.getById(uuid(4))).resolves.toMatchObject({
      id: uuid(4),
      title: 'Détail',
    });
    expect(path(requests[0])).toBe(`/experiences/${uuid(4)}`);
  });

  it('getById(): 404 is null (unknown experience); a non-UUID id is null without a request', async () => {
    const { repositories, requests } = setup(() => apiError(404, 'NOT_FOUND'));

    await expect(repositories.experiences.getById(uuid(5))).resolves.toBeNull();
    await expect(repositories.experiences.getById('exp-jazz-night')).resolves.toBeNull();
    expect(requests).toHaveLength(1);
  });

  it('getById(): 401 rejects and ends the session', async () => {
    const { repositories, sessionStorage } = setup(() => apiError(401, 'AUTH_SESSION_INVALID'));
    const expired = jest.fn();
    repositories.auth.onSessionExpired(expired);

    await expect(repositories.experiences.getById(uuid(6))).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    await expect(sessionStorage.getToken()).resolves.toBeNull();
  });
});

describe('ApiAuthRepository', () => {
  const session = { token: 'new-token', expiresAt: '2026-10-26T12:00:00.000Z' };

  it('login: posts the credentials without a token and keeps the new session token', async () => {
    const { repositories, requests, sessionStorage } = setup(
      () => ok({ user: userDto, session }),
      null,
    );

    await repositories.auth.login({ email: ' lea@example.com ', password: 'secret123' });

    expect(requests[0]).toMatchObject({
      method: 'POST',
      body: { email: 'lea@example.com', password: 'secret123' },
    });
    expect(path(requests[0])).toBe('/auth/login');
    expect(requests[0].headers.Authorization).toBeUndefined();
    await expect(sessionStorage.getToken()).resolves.toBe('new-token');
  });

  it('login: wrong credentials reject with AUTH_INVALID_CREDENTIALS and keep no session', async () => {
    const { repositories, sessionStorage } = setup(
      () => apiError(401, 'AUTH_INVALID_CREDENTIALS'),
      null,
    );
    const expired = jest.fn();
    repositories.auth.onSessionExpired(expired);

    const error = await repositories.auth
      .login({ email: 'lea@example.com', password: 'nope' })
      .catch((reason: unknown) => reason);

    expect(isApiError(error) && error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(expired).not.toHaveBeenCalled();
    await expect(sessionStorage.getToken()).resolves.toBeNull();
  });

  it('login: rate limited → 429 with Retry-After, no session', async () => {
    const { repositories, sessionStorage } = setup(
      () =>
        apiError(429, 'TOO_MANY_REQUESTS', 'Too many requests: try again later.', {
          headers: { 'Retry-After': '900' },
        }),
      null,
    );

    await expect(
      repositories.auth.login({ email: 'lea@example.com', password: 'x' }),
    ).rejects.toMatchObject({ status: 429, retryAfterSeconds: 900 });
    await expect(sessionStorage.getToken()).resolves.toBeNull();
  });

  it('register: sends the first name as displayName and keeps the session; 409 when the email is used', async () => {
    const created = setup(() => ok({ user: userDto, session }, 201), null);
    await created.repositories.auth.register({
      displayName: ' Léa ',
      email: 'lea@example.com',
      password: 'secret123',
    });
    expect(path(created.requests[0])).toBe('/auth/register');
    expect(created.requests[0].body).toEqual({
      displayName: 'Léa',
      email: 'lea@example.com',
      password: 'secret123',
    });
    await expect(created.sessionStorage.getToken()).resolves.toBe('new-token');

    const taken = setup(() => apiError(409, 'AUTH_EMAIL_ALREADY_EXISTS'), null);
    await expect(
      taken.repositories.auth.register({
        displayName: 'L',
        email: 'lea@example.com',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'AUTH_EMAIL_ALREADY_EXISTS' });
    await expect(taken.sessionStorage.getToken()).resolves.toBeNull();
  });

  describe('restoreSession', () => {
    it('no stored token: signed out, without a request', async () => {
      const { repositories, requests } = setup(() => ok(userDto), null);
      await expect(repositories.auth.restoreSession()).resolves.toBe(false);
      expect(requests).toHaveLength(0);
    });

    it('a valid token: GET /auth/me answers → signed in', async () => {
      const { repositories, requests } = setup(() => ok(userDto));
      await expect(repositories.auth.restoreSession()).resolves.toBe(true);
      expect(path(requests[0])).toBe('/auth/me');
      expect(requests[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it('an expired token: 401 → signed out, token forgotten', async () => {
      const { repositories, sessionStorage } = setup(() => apiError(401, 'AUTH_SESSION_INVALID'));
      await expect(repositories.auth.restoreSession()).resolves.toBe(false);
      await expect(sessionStorage.getToken()).resolves.toBeNull();
    });

    it('offline or server error: the kept session is trusted', async () => {
      const offline = setup(() => {
        throw new TypeError('Network request failed');
      });
      await expect(offline.repositories.auth.restoreSession()).resolves.toBe(true);
      await expect(offline.sessionStorage.getToken()).resolves.toBe(TOKEN);

      const down = setup(() => apiError(503, 'DATABASE_UNAVAILABLE'));
      await expect(down.repositories.auth.restoreSession()).resolves.toBe(true);
    });
  });

  describe('logout', () => {
    it('tells the API with the token, then forgets it', async () => {
      const { repositories, requests, sessionStorage } = setup(() => ({ status: 204 }));

      await repositories.auth.logout();

      expect(requests[0]).toMatchObject({ method: 'POST' });
      expect(path(requests[0])).toBe('/auth/logout');
      expect(requests[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
      await expect(sessionStorage.getToken()).resolves.toBeNull();
    });

    it('offline: still forgets the session and resolves', async () => {
      const { repositories, sessionStorage } = setup(() => {
        throw new TypeError('Network request failed');
      });
      await expect(repositories.auth.logout()).resolves.toBeUndefined();
      await expect(sessionStorage.getToken()).resolves.toBeNull();
    });

    it('already expired token: the API answers 204 anyway', async () => {
      const { repositories, sessionStorage } = setup(() => ({ status: 204 }), 'expired-token');
      await repositories.auth.logout();
      await expect(sessionStorage.getToken()).resolves.toBeNull();
    });
  });

  it('onSessionExpired: unsubscribing stops the notifications', async () => {
    const { repositories } = setup(() => apiError(401, 'AUTH_SESSION_INVALID'));
    const listener = jest.fn();
    const unsubscribe = repositories.auth.onSessionExpired(listener);
    unsubscribe();

    await repositories.users.getCurrentUser().catch(() => {});
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('ApiUserRepository', () => {
  it('getCurrentUser(): GET /auth/me, mapped', async () => {
    const { repositories, requests } = setup(() => ok(userDto));

    await expect(repositories.users.getCurrentUser()).resolves.toEqual({
      id: 'u1',
      email: 'lea@example.com',
      displayName: 'Léa',
      avatarUrl: undefined,
      age: undefined,
      city: 'Paris',
      bio: undefined,
    });
    expect(path(requests[0])).toBe('/auth/me');
  });
});

describe('ApiSearchRepository', () => {
  it('search(): text, category slug and budget as API filters; unsupported filters are not sent', async () => {
    const { repositories, requests } = setup(() =>
      ok({ items: [experienceDto(1)], nextCursor: null }),
    );

    const results = await repositories.search.search(' rooftop ', {
      categoryId: 'cat-bar',
      budget: '10to25',
      maxDistanceKm: 2,
      openNow: true,
      when: 'now',
      walkable: true,
    });

    expect(results.map((experience) => experience.id)).toEqual([uuid(1)]);
    expect(path(requests[0])).toBe('/experiences?q=rooftop&category=bar&budget=10to25&limit=100');
  });

  it('search(): below two characters no text filter is sent (the API refuses it)', async () => {
    const { repositories, requests } = setup(() => ok({ items: [], nextCursor: null }));
    await repositories.search.search('r');
    expect(path(requests[0])).toBe('/experiences?limit=100');
  });

  it('suggest(): experience titles and matching tags from one request; nothing below two characters', async () => {
    const { repositories, requests } = setup(() =>
      ok({
        items: [
          experienceDto(1, {
            title: 'Rooftop sunset',
            roam: {
              atmosphere: [],
              energyLevel: 'unknown',
              suitableFor: [],
              bestMoments: [],
              tags: ['rooftop', 'sunset'],
              estimatedDurationMin: null,
              durationIsDerived: false,
              source: 'curated',
            },
          }),
        ],
        nextCursor: null,
      }),
    );

    await expect(repositories.search.suggest('r')).resolves.toEqual([]);
    const suggestions = await repositories.search.suggest('roof');

    expect(requests).toHaveLength(1);
    expect(path(requests[0])).toBe('/experiences?q=roof&limit=20');
    expect(suggestions).toEqual([
      { id: 'query-rooftop', label: 'rooftop', type: 'query' },
      {
        id: `experience-${uuid(1)}`,
        label: 'Rooftop sunset',
        type: 'experience',
        experienceId: uuid(1),
      },
    ]);
  });
});

describe('ApiFavoriteRepository (prepared for API-10)', () => {
  it('lists favorite ids from GET /favorites, saves with POST and removes with DELETE — no check endpoint', async () => {
    const { repositories, requests } = setup((request) => {
      if (request.method === 'GET') {
        return ok({
          items: [
            {
              id: 'f1',
              experienceId: uuid(1),
              createdAt: '2026-09-26T12:00:00.000Z',
              experience: experienceDto(1),
            },
          ],
          nextCursor: null,
        });
      }
      return request.method === 'DELETE' ? { status: 204 } : ok({ id: 'f2' }, 201);
    });

    await expect(repositories.favorites.listExperienceIds()).resolves.toEqual([uuid(1)]);
    await repositories.favorites.add(uuid(2));
    await repositories.favorites.remove(uuid(1));

    expect(requests.map((request) => `${request.method} ${path(request)}`)).toEqual([
      'GET /favorites?limit=100',
      'POST /favorites',
      `DELETE /favorites/${uuid(1)}`,
    ]);
    expect(requests[1].body).toEqual({ experienceId: uuid(2) });
  });
});

describe('createApiRepositories: domains still local in API mode', () => {
  it('serves categories, collections, places, journeys and journey feedback without a request', async () => {
    const { repositories, requests } = setup(() => apiError(500, 'INTERNAL_SERVER_ERROR'));

    await repositories.categories.list();
    await repositories.collections.list();
    await repositories.places.getById('place-cafe');
    await repositories.journeys.getCurrent();
    await repositories.journeyFeedback.getForJourney('j1');

    expect(requests).toHaveLength(0);
  });
});
