import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import type { PlaceProvider } from '../provider.types.js';
import { GeoapifyAdapter } from './geoapify.adapter.js';
import type { GeoapifyClient } from './geoapify.client.js';
import { ALL_GEOAPIFY_CATEGORIES } from './geoapify.mapper.js';

const PLACE = {
  osmType: 'node' as const,
  osmId: '100',
  name: 'Bar Test',
  lat: 48.86,
  lon: 2.36,
  categories: ['catering', 'catering.bar'],
};

function setup() {
  const client = { searchNearby: vi.fn(), getPlace: vi.fn() };
  return {
    client,
    adapter: new GeoapifyAdapter(client as unknown as GeoapifyClient),
  };
}

const QUERY = { latitude: 48.8566, longitude: 2.3522, radiusMeters: 800 };

describe('GeoapifyAdapter (client mocked)', () => {
  it('is a PlaceProvider with the stable provider key', () => {
    const provider: PlaceProvider = setup().adapter;
    expect(provider.identity).toEqual({ key: 'geoapify', name: 'Geoapify' });
  });

  it('searchNearby: translates the ROAM query and returns normalized places', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([PLACE]);

    const places = await adapter.searchNearby({ ...QUERY, maxResults: 3, categorySlugs: ['bar'] });

    expect(client.searchNearby).toHaveBeenCalledWith({
      latitude: 48.8566,
      longitude: 2.3522,
      radiusMeters: 800,
      limit: 3,
      categories: ['catering.bar', 'catering.pub'],
    });
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      name: 'Bar Test',
      categorySlugs: ['bar'],
      source: { providerKey: 'geoapify', externalId: 'node/100' },
    });
  });

  it('searchNearby: several results, in order', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([PLACE, { ...PLACE, osmType: 'way', osmId: '7' }]);

    const places = await adapter.searchNearby(QUERY);

    expect(places.map((place) => place.source.externalId)).toEqual(['node/100', 'way/7']);
  });

  it('searchNearby: no category → every category ROAM maps (Geoapify requires one), 20 results', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([]);

    await expect(adapter.searchNearby(QUERY)).resolves.toEqual([]);

    expect(client.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ALL_GEOAPIFY_CATEGORIES, limit: 20 }),
    );
  });

  it('searchNearby: categories Geoapify cannot express → no request, no result', async () => {
    const { adapter, client } = setup();
    await expect(
      adapter.searchNearby({ ...QUERY, categorySlugs: ['experience'] }),
    ).resolves.toEqual([]);
    expect(client.searchNearby).not.toHaveBeenCalled();
  });

  it.each([
    [{ latitude: 91 }, /coordinates/],
    [{ longitude: -181 }, /coordinates/],
    [{ latitude: Number.NaN }, /coordinates/],
    [{ radiusMeters: 0 }, /radius/],
    [{ radiusMeters: 50_001 }, /radius/],
    [{ maxResults: 0 }, /maxResults/],
    [{ maxResults: 21 }, /maxResults/],
    [{ maxResults: 2.5 }, /maxResults/],
  ])('searchNearby: refuses %o before any request', async (override, message) => {
    const { adapter, client } = setup();
    await expect(adapter.searchNearby({ ...QUERY, ...override })).rejects.toThrow(message);
    expect(client.searchNearby).not.toHaveBeenCalled();
  });

  it('searchNearby: the limits themselves are accepted', async () => {
    const { adapter, client } = setup();
    client.searchNearby.mockResolvedValue([]);
    await adapter.searchNearby({ ...QUERY, radiusMeters: 50_000, maxResults: 20 });
    await adapter.searchNearby({ ...QUERY, radiusMeters: 1, maxResults: 1 });
    expect(client.searchNearby).toHaveBeenCalledTimes(2);
  });

  it('getPlace: looks the OpenStreetMap object up and normalizes it', async () => {
    const { adapter, client } = setup();
    client.getPlace.mockResolvedValue(PLACE);

    await expect(adapter.getPlace('node/100')).resolves.toMatchObject({
      name: 'Bar Test',
      source: { externalId: 'node/100' },
    });
    expect(client.getPlace).toHaveBeenCalledWith('node', '100');
  });

  it('getPlace: an unknown place is null', async () => {
    const { adapter, client } = setup();
    client.getPlace.mockResolvedValue(null);
    await expect(adapter.getPlace('way/1')).resolves.toBeNull();
  });

  it('getPlace: an id that is not a Geoapify external id is refused before any request', async () => {
    const { adapter, client } = setup();
    await expect(adapter.getPlace('ChIJ-google-id')).rejects.toThrow(RangeError);
    expect(client.getPlace).not.toHaveBeenCalled();
  });

  it.each([
    new ProviderRateLimitError('geoapify', 'searchNearby', 'HTTP 429'),
    new ProviderAuthenticationError('geoapify', 'searchNearby', 'HTTP 401'),
    new ProviderUnavailableError('geoapify', 'searchNearby', 'HTTP 503', 503),
  ])('provider errors pass through typed (%o)', async (error) => {
    const { adapter, client } = setup();
    client.searchNearby.mockRejectedValue(error);
    await expect(adapter.searchNearby(QUERY)).rejects.toBe(error);
  });
});
