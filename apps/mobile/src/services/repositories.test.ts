import { repositories } from './index';

describe('repositories (mock implementation)', () => {
  it('lists categories', async () => {
    const categories = await repositories.categories.list();
    expect(categories.length).toBeGreaterThan(0);
  });

  it('resolves an experience and its places through the repository contracts', async () => {
    const experience = await repositories.experiences.getById('exp-slow-afternoon');
    expect(experience).not.toBeNull();

    const places = await Promise.all(
      experience!.placeIds.map((id) => repositories.places.getById(id)),
    );
    expect(places.every((place) => place !== null)).toBe(true);
  });

  it('returns null for unknown ids', async () => {
    expect(await repositories.experiences.getById('nope')).toBeNull();
    expect(await repositories.places.getById('nope')).toBeNull();
    expect(await repositories.collections.getById('nope')).toBeNull();
  });

  it('lists collections and resolves one by id', async () => {
    const collections = await repositories.collections.list();
    expect(collections.length).toBeGreaterThan(0);

    const [first] = collections;
    expect(await repositories.collections.getById(first.id)).toEqual(first);
  });

  it('returns copies so callers cannot mutate the fixtures', async () => {
    const [first] = await repositories.experiences.list();
    first.title = 'mutated';
    const [again] = await repositories.experiences.list();
    expect(again.title).not.toBe('mutated');
  });
});

describe('mock auth repository (DATA-8 contract)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps a "signed in" flag only — any credentials succeed — until logout', async () => {
    await repositories.auth.logout();
    await expect(repositories.auth.restoreSession()).resolves.toBe(false);

    const login = repositories.auth.login({ email: 'any@thing.test', password: 'whatever' });
    await jest.advanceTimersByTimeAsync(1000);
    await login;
    await expect(repositories.auth.restoreSession()).resolves.toBe(true);

    await repositories.auth.logout();
    await expect(repositories.auth.restoreSession()).resolves.toBe(false);
  });

  it('never stores a password or a token', async () => {
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    const register = repositories.auth.register({
      displayName: 'Léa',
      email: 'lea@example.com',
      password: 'secret123',
    });
    await jest.advanceTimersByTimeAsync(1000);
    await register;

    const keys: string[] = await AsyncStorage.getAllKeys();
    const values: [string, string | null][] = await AsyncStorage.multiGet(keys);
    expect(JSON.stringify(values)).not.toContain('secret123');
    expect(keys.some((key) => /token/i.test(key))).toBe(false);
  });

  it('never reports an expired session', () => {
    const unsubscribe = repositories.auth.onSessionExpired(jest.fn());
    expect(typeof unsubscribe).toBe('function');
  });
});

describe('mock favorite repository', () => {
  it('is seeded from the mock flags, idempotent both ways', async () => {
    const seeded = await repositories.favorites.listExperienceIds();
    expect(seeded.length).toBeGreaterThan(0);

    await repositories.favorites.add('exp-lake-hike');
    await repositories.favorites.add('exp-lake-hike');
    expect((await repositories.favorites.listExperienceIds())[0]).toBe('exp-lake-hike');
    expect(
      (await repositories.favorites.listExperienceIds()).filter((id) => id === 'exp-lake-hike'),
    ).toHaveLength(1);

    await repositories.favorites.remove('exp-lake-hike');
    await repositories.favorites.remove('exp-lake-hike');
    expect(await repositories.favorites.listExperienceIds()).toEqual(seeded);
  });
});

describe('createRepositories (the single source switch)', () => {
  it('mock: the in-app pools; api: every API domain on the API, never the mocks', async () => {
    const { createRepositories } = jest.requireActual<typeof import('./index')>('./index');

    const mock = createRepositories({ source: 'mock' });
    await expect(mock.experiences.getById('exp-jazz-night')).resolves.not.toBeNull();

    const fetchSpy = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy;
    try {
      const api = createRepositories({ source: 'api', apiUrl: 'http://api.test' });
      // A failed API call is an error — not the mock data.
      await expect(api.experiences.list()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
      await expect(api.search.search('jazz')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
      expect(fetchSpy).toHaveBeenCalled();
      expect(String(fetchSpy.mock.calls[0][0])).toMatch(/^http:\/\/api\.test\/api\/v1\//);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
