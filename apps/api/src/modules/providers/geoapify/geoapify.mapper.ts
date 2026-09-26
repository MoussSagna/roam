import type { NormalizedPlace } from '../provider.types.js';
import { GEOAPIFY_PROVIDER } from './geoapify.client.js';
import type { GeoapifyPlaceDto, OsmType } from './geoapify.dto.js';

/**
 * Geoapify categories → ROAM category slugs (the DATA-1 vocabulary). Explicit and conservative: only categories
 * whose meaning is unambiguous. A key covers its sub-categories (`catering.cafe` covers `catering.cafe.coffee`);
 * any other category gives no ROAM category (its raw value stays in the provenance).
 */
export const GEOAPIFY_CATEGORY_TO_CATEGORY: Readonly<Record<string, string>> = {
  'catering.cafe': 'cafe',
  'catering.restaurant': 'restaurant',
  'catering.bar': 'bar',
  'catering.pub': 'bar',
  'leisure.park': 'park',
  'entertainment.museum': 'culture',
  'entertainment.culture': 'culture',
  national_park: 'nature',
  natural: 'nature',
};

/** The Geoapify categories of ROAM categories (Places `categories`). Unknown slugs give no category. */
export function geoapifyCategoriesForCategories(slugs: readonly string[]): string[] {
  return Object.entries(GEOAPIFY_CATEGORY_TO_CATEGORY)
    .filter(([, slug]) => slugs.includes(slug))
    .map(([category]) => category);
}

/** Every Geoapify category ROAM maps: the search scope when a query names no category. */
export const ALL_GEOAPIFY_CATEGORIES = Object.keys(GEOAPIFY_CATEGORY_TO_CATEGORY);

function roamCategory(category: string): string | undefined {
  for (const [key, slug] of Object.entries(GEOAPIFY_CATEGORY_TO_CATEGORY))
    if (category === key || category.startsWith(`${key}.`)) return slug;
  return undefined;
}

/**
 * The external id of a Geoapify place: its OpenStreetMap object, `node/123`, `way/456` or `relation/789` — stable
 * across Geoapify endpoints and requests (GEOAPIFY_PROVIDER.md "Identity").
 */
export const geoapifyExternalId = (osmType: OsmType, osmId: string) => `${osmType}/${osmId}`;

/** The OpenStreetMap object of an external id, `null` when it is not one. */
export function parseGeoapifyExternalId(
  externalId: string,
): { osmType: OsmType; osmId: string } | null {
  const match = /^(node|way|relation)\/(\d{1,20})$/.exec(externalId);
  return match ? { osmType: match[1] as OsmType, osmId: match[2] } : null;
}

/**
 * A validated Geoapify place → a ROAM normalized place: provider facts only. Geoapify (OpenStreetMap data) has no
 * rating, review count or price level: they stay `null`/`UNKNOWN`, never guessed. Nothing of the Geoapify payload
 * survives but the mapped values; no ROAM enrichment is inferred here (DATA-5).
 */
export function mapGeoapifyPlaceToRoamPlace(place: GeoapifyPlaceDto): NormalizedPlace {
  const categories = place.categories ?? [];
  const name = place.name.trim();
  // `formatted` starts with the place name when it has one; `address_line2` is then the address alone.
  const address =
    (place.addressLine1?.trim() === name ? place.addressLine2 : place.formatted)?.trim() || null;

  return {
    source: {
      providerKey: GEOAPIFY_PROVIDER.key,
      externalId: geoapifyExternalId(place.osmType, place.osmId),
      // Geoapify gives no page for a place (`datasource.url` is the OpenStreetMap licence page).
      externalUrl: null,
      providerCategories: categories,
    },
    name,
    address,
    city: place.city?.trim() || null,
    latitude: place.lat,
    longitude: place.lon,
    priceLevel: 'UNKNOWN',
    rating: null,
    reviewCount: null,
    // Geoapify returns existing places only: it reports no closure status to map.
    isActive: true,
    categorySlugs: [
      ...new Set(categories.map(roamCategory).filter((slug): slug is string => !!slug)),
    ],
  };
}
