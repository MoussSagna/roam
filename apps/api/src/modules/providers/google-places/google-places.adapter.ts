import { Injectable } from '@nestjs/common';

import { ProviderNotFoundError } from '../provider.errors.js';
import type {
  NearbyPlaceQuery,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from '../provider.types.js';
import { GOOGLE_PLACES_PROVIDER, GooglePlacesClient } from './google-places.client.js';
import { googleTypesForCategories, mapGooglePlaceToRoamPlace } from './google-places.mapper.js';

/** Nearby Search limits (Google): radius in (0, 50 000] m, 1–20 results. */
export const GOOGLE_NEARBY_LIMITS = { maxRadiusMeters: 50_000, maxResults: 20 } as const;

/**
 * Google Places behind the provider contract: translates a ROAM query into a Google request, and Google places
 * into normalized ROAM places. Provider errors pass through typed (provider.errors.ts); an unknown place id is
 * `null`, like any lookup of the catalog.
 */
@Injectable()
export class GooglePlacesAdapter implements PlaceProvider {
  readonly identity: ProviderIdentity = GOOGLE_PLACES_PROVIDER;

  constructor(private readonly client: GooglePlacesClient) {}

  async searchNearby(query: NearbyPlaceQuery): Promise<NormalizedPlace[]> {
    const { latitude, longitude, radiusMeters } = query;
    const maxResults = query.maxResults ?? GOOGLE_NEARBY_LIMITS.maxResults;
    if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180))
      throw new RangeError('searchNearby: invalid coordinates');
    if (!(radiusMeters > 0 && radiusMeters <= GOOGLE_NEARBY_LIMITS.maxRadiusMeters))
      throw new RangeError(
        `searchNearby: radius must be in (0, ${GOOGLE_NEARBY_LIMITS.maxRadiusMeters}] m`,
      );
    if (
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > GOOGLE_NEARBY_LIMITS.maxResults
    )
      throw new RangeError(`searchNearby: maxResults must be 1–${GOOGLE_NEARBY_LIMITS.maxResults}`);

    let includedTypes: string[] | undefined;
    if (query.categorySlugs?.length) {
      includedTypes = googleTypesForCategories(query.categorySlugs);
      // Categories Google cannot express: searching without a type filter would return unrelated places.
      if (includedTypes.length === 0) return [];
    }

    const places = await this.client.searchNearby({
      latitude,
      longitude,
      radiusMeters,
      maxResultCount: maxResults,
      includedTypes,
    });
    return places.map(mapGooglePlaceToRoamPlace);
  }

  async getPlace(externalId: string): Promise<NormalizedPlace | null> {
    try {
      return mapGooglePlaceToRoamPlace(await this.client.getPlace(externalId));
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return null;
      throw error;
    }
  }
}
