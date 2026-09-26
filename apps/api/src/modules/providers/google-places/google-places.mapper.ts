import type { PriceLevel } from '../../../generated/prisma/enums.js';
import type { NormalizedPlace } from '../provider.types.js';
import { GOOGLE_PLACES_PROVIDER } from './google-places.client.js';
import type { GooglePlaceDto } from './google-places.dto.js';

/**
 * Google place types (Table A) → ROAM category slugs (the DATA-1 vocabulary). Explicit and conservative: only
 * types whose meaning is unambiguous; any other type gives no category (its raw value stays in the provenance).
 */
export const GOOGLE_TYPE_TO_CATEGORY: Readonly<Record<string, string>> = {
  cafe: 'cafe',
  coffee_shop: 'cafe',
  tea_house: 'cafe',
  restaurant: 'restaurant',
  bar: 'bar',
  pub: 'bar',
  wine_bar: 'bar',
  park: 'park',
  museum: 'culture',
  art_gallery: 'culture',
  performing_arts_theater: 'culture',
  national_park: 'nature',
  hiking_area: 'nature',
  botanical_garden: 'nature',
};

/** The Google types of ROAM categories (Nearby Search `includedTypes`). Unknown slugs give no type. */
export function googleTypesForCategories(slugs: readonly string[]): string[] {
  return Object.entries(GOOGLE_TYPE_TO_CATEGORY)
    .filter(([, slug]) => slugs.includes(slug))
    .map(([type]) => type);
}

/** Google's price level → ROAM's (NORMALIZATION_AND_ENRICHMENT.md): the same five steps, `UNKNOWN` otherwise. */
const PRICE_LEVELS: Readonly<Record<string, PriceLevel>> = {
  PRICE_LEVEL_FREE: 'FREE',
  PRICE_LEVEL_INEXPENSIVE: 'LOW',
  PRICE_LEVEL_MODERATE: 'MEDIUM',
  PRICE_LEVEL_EXPENSIVE: 'HIGH',
  PRICE_LEVEL_VERY_EXPENSIVE: 'VERY_HIGH',
};

/**
 * A validated Google place → a ROAM normalized place: provider facts only. Nothing of the Google payload survives
 * but the mapped values; no ROAM enrichment is inferred here (DATA-5).
 */
export function mapGooglePlaceToRoamPlace(place: GooglePlaceDto): NormalizedPlace {
  const types = place.types ?? [];
  const city =
    place.addressComponents?.find((component) => component.types?.includes('locality'))?.longText ??
    null;
  const rating =
    place.rating !== undefined && place.rating >= 0 && place.rating <= 5 ? place.rating : null;
  const reviewCount =
    place.userRatingCount !== undefined &&
    Number.isInteger(place.userRatingCount) &&
    place.userRatingCount >= 0
      ? place.userRatingCount
      : null;

  return {
    source: {
      providerKey: GOOGLE_PLACES_PROVIDER.key,
      externalId: place.id,
      externalUrl: place.googleMapsUri ?? null,
      providerCategories: types,
    },
    name: place.displayName.text.trim(),
    address: place.formattedAddress?.trim() || null,
    city,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    priceLevel: (place.priceLevel && PRICE_LEVELS[place.priceLevel]) || 'UNKNOWN',
    rating,
    reviewCount,
    isActive: place.businessStatus !== 'CLOSED_PERMANENTLY',
    categorySlugs: [...new Set(types.map((type) => GOOGLE_TYPE_TO_CATEGORY[type]).filter(Boolean))],
  };
}
