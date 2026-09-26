import {
  ProviderNotFoundError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import { GooglePlacesAdapter } from './google-places.adapter.js';
import type { GooglePlacesClient } from './google-places.client.js';

const PLACE = {
  id: 'ChIJ-fake',
  displayName: { text: 'Bar Test' },
  location: { latitude: 48.86, longitude: 2.36 },
  types: ['bar'],
};

function setup() {
  const client = { searchNearby: vi.fn(), getPlace: vi.fn() };
  return {
    client,
    adapter: new GooglePlacesAdapter(client as unknown as GooglePlacesClient),
  };
}

const QUERY = { latitude: 48.8566, longitude: 2.3522, radiusMeters: 800 };

describe('GooglePlacesAdapter (client mocked)', () => {
  it('identifies itself with the stable provider key', () => {
    expect(setup().adapter.identity).toEqual({ key: 'google_places', name: 'Google Places' });
  });

  it('searchNearby: translates the ROAM query and returns normalized places', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([PLACE]);

    const places = await adapter.searchNearby({ ...QUERY, maxResults: 3, categorySlugs: ['bar'] });

    expect(client.searchNearby).toHaveBeenCalledWith({
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 800,
      maxResultCount: 3,
      includedTypes: ['bar', 'pub', 'wine_bar'],
    });
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      name: 'Bar Test',
      categorySlugs: ['bar'],
      source: { providerKey: 'google_places', externalId: 'ChIJ-fake' },
    });
  });

  it('searchNearby: default of 20 results, no type filter without categories', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([]);

    await adapter.searchNearby(QUERY);

    expect(client.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ maxResultCount: 20, includedTypes: undefined }),
    );
  });

  it('searchNearby: categories Google cannot express → no request, no result', async () => {
    const { adapter, client } = setup();
    await expect(
      adapter.searchNearby({ ...QUERY, categorySlugs: ['experience'] }),
    ).resolves.toEqual([]);
    expect(client.searchNearby).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...QUERY, radiusMeters: 0 }],
    [{ ...QUERY, radiusMeters: 50_001 }],
    [{ ...QUERY, latitude: 91 }],
    [{ ...QUERY, longitude: Number.NaN }],
    [{ ...QUERY, maxResults: 21 }],
    [{ ...QUERY, maxResults: 0 }],
  ])(
    'searchNearby: refuses a query outside Google limits before any request (%o)',
    async (query) => {
      const { adapter, client } = setup();
      await expect(adapter.searchNearby(query)).rejects.toBeInstanceOf(RangeError);
      expect(client.searchNearby).not.toHaveBeenCalled();
    },
  );

  it('getPlace: normalized place; unknown id → null', async () => {
    const { adapter, client } = setup();
    client.getPlace
      .mockResolvedValueOnce(PLACE)
      .mockRejectedValueOnce(new ProviderNotFoundError('google_places', 'getPlace', 'HTTP 404'));

    await expect(adapter.getPlace('ChIJ-fake')).resolves.toMatchObject({ name: 'Bar Test' });
    await expect(adapter.getPlace('ChIJ-gone')).resolves.toBeNull();
  });

  it('provider errors pass through typed', async () => {
    const { adapter, client } = setup();
    client.getPlace.mockRejectedValue(
      new ProviderRateLimitError('google_places', 'getPlace', 'HTTP 429'),
    );
    client.searchNearby.mockRejectedValue(
      new ProviderUnavailableError('google_places', 'searchNearby', 'HTTP 503', 503),
    );

    await expect(adapter.getPlace('x')).rejects.toBeInstanceOf(ProviderRateLimitError);
    await expect(adapter.searchNearby(QUERY)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
