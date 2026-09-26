/**
 * Google Places API (New) response shapes, limited to the fields of the field masks (google-places.client.ts).
 * Google-only: nothing outside `google-places/` imports this file.
 * https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
 */

export type GoogleAddressComponent = { longText?: string; shortText?: string; types?: string[] };

/** A place as returned for our field mask. Only `id`, `displayName` and `location` are required by ROAM. */
export type GooglePlaceDto = {
  id: string;
  displayName: { text: string; languageCode?: string };
  location: { latitude: number; longitude: number };
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  types?: string[];
  businessStatus?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  /** `PRICE_LEVEL_FREE` … `PRICE_LEVEL_VERY_EXPENSIVE`, or `PRICE_LEVEL_UNSPECIFIED`; kept as a string (new values). */
  priceLevel?: string;
};

/** Google's error body (google.rpc.Status). */
export type GoogleErrorBody = { error?: { code?: number; status?: string; message?: string } };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

/**
 * Validates one place. `null` when a field ROAM cannot do without is missing or invalid (id, name, coordinates);
 * optional fields of the wrong type are dropped, never guessed.
 */
export function parseGooglePlace(value: unknown): GooglePlaceDto | null {
  if (!isObject(value)) return null;
  const { id, displayName, location } = value;
  if (typeof id !== 'string' || id.trim() === '') return null;
  if (!isObject(displayName) || typeof displayName.text !== 'string') return null;
  if (displayName.text.trim() === '') return null;
  if (!isObject(location)) return null;
  const { latitude, longitude } = location;
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) return null;
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) return null;

  return {
    id,
    displayName: { text: displayName.text, languageCode: optionalString(displayName.languageCode) },
    location: { latitude, longitude },
    formattedAddress: optionalString(value.formattedAddress),
    addressComponents: Array.isArray(value.addressComponents)
      ? value.addressComponents.filter(isObject).map((component) => ({
          longText: optionalString(component.longText),
          shortText: optionalString(component.shortText),
          types: stringList(component.types),
        }))
      : undefined,
    types: stringList(value.types),
    businessStatus: optionalString(value.businessStatus),
    googleMapsUri: optionalString(value.googleMapsUri),
    rating: optionalNumber(value.rating),
    userRatingCount: optionalNumber(value.userRatingCount),
    priceLevel: optionalString(value.priceLevel),
  };
}

/**
 * Validates a Nearby Search body: `{ places?: unknown[] }` (Google omits `places` when nothing matches). `null` when
 * the body itself is not that shape; places that fail validation are counted in `skipped`, not returned.
 */
export function parseNearbySearchResponse(
  value: unknown,
): { places: GooglePlaceDto[]; skipped: number } | null {
  if (!isObject(value)) return null;
  if (value.places === undefined) return { places: [], skipped: 0 };
  if (!Array.isArray(value.places)) return null;
  const places = value.places.map(parseGooglePlace);
  const valid = places.filter((place): place is GooglePlaceDto => place !== null);
  return { places: valid, skipped: places.length - valid.length };
}
