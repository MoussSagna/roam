import { Injectable } from '@nestjs/common';

import type {
  NearbyPlaceQuery,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from '../provider.types.js';
import { GEOAPIFY_PROVIDER, GeoapifyClient } from './geoapify.client.js';
import {
  ALL_GEOAPIFY_CATEGORIES,
  geoapifyCategoriesForCategories,
  mapGeoapifyPlaceToRoamPlace,
  parseGeoapifyExternalId,
} from './geoapify.mapper.js';

/**
 * Nearby search limits. Geoapify accepts 1–500 results and documents no maximum radius; ROAM keeps a tighter
 * ceiling (GEOAPIFY_PROVIDER.md "Limits"): 20 results is one credit (Geoapify bills every 20 places), and 50 km is
 * the radius already allowed for Google — no DATA-2.1 flow needs more, and no large import is run.
 */
export const GEOAPIFY_NEARBY_LIMITS = { maxRadiusMeters: 50_000, maxResults: 20 } as const;

/**
 * Geoapify behind the provider contract: translates a ROAM query into a Geoapify request, and Geoapify places into
 * normalized ROAM places. Provider errors pass through typed (provider.errors.ts); an unknown place is `null`, like
 * any lookup of the catalog.
 */
@Injectable()
export class GeoapifyAdapter implements PlaceProvider {
  readonly identity: ProviderIdentity = GEOAPIFY_PROVIDER;

  constructor(private readonly client: GeoapifyClient) {}

  async searchNearby(query: NearbyPlaceQuery): Promise<NormalizedPlace[]> {
    const { latitude, longitude, radiusMeters } = query;
    const maxResults = query.maxResults ?? GEOAPIFY_NEARBY_LIMITS.maxResults;
    if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180))
      throw new RangeError('searchNearby: invalid coordinates');
    if (!(radiusMeters > 0 && radiusMeters <= GEOAPIFY_NEARBY_LIMITS.maxRadiusMeters))
      throw new RangeError(
        `searchNearby: radius must be in (0, ${GEOAPIFY_NEARBY_LIMITS.maxRadiusMeters}] m`,
      );
    if (
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > GEOAPIFY_NEARBY_LIMITS.maxResults
    )
      throw new RangeError(
        `searchNearby: maxResults must be 1–${GEOAPIFY_NEARBY_LIMITS.maxResults}`,
      );

    // Geoapify requires categories: without a ROAM category, every category ROAM maps.
    let categories = ALL_GEOAPIFY_CATEGORIES;
    if (query.categorySlugs?.length) {
      categories = geoapifyCategoriesForCategories(query.categorySlugs);
      // Categories Geoapify cannot express: a wider search would return unrelated places.
      if (categories.length === 0) return [];
    }

    const places = await this.client.searchNearby({
      latitude,
      longitude,
      radiusMeters,
      limit: maxResults,
      categories,
    });
    return places.map(mapGeoapifyPlaceToRoamPlace);
  }

  /** `externalId` is the OpenStreetMap object (`node/123`), as recorded by `searchNearby`. */
  async getPlace(externalId: string): Promise<NormalizedPlace | null> {
    const osm = parseGeoapifyExternalId(externalId);
    if (!osm) throw new RangeError('getPlace: not a Geoapify external id (node|way|relation/<id>)');
    const place = await this.client.getPlace(osm.osmType, osm.osmId);
    return place ? mapGeoapifyPlaceToRoamPlace(place) : null;
  }
}
