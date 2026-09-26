/**
 * Geoapify Places / Place Details response shapes (GeoJSON), limited to the fields ROAM reads. Geoapify-only:
 * nothing outside `geoapify/` imports this file.
 * https://apidocs.geoapify.com/docs/places/ · https://apidocs.geoapify.com/docs/place-details/
 */

/** OpenStreetMap object types, as Geoapify reports them in `datasource.raw.osm_type`. */
export const OSM_TYPES = { n: 'node', w: 'way', r: 'relation' } as const;
export type OsmType = (typeof OSM_TYPES)[keyof typeof OSM_TYPES];

/**
 * A place as ROAM reads it from a Geoapify feature. The identity is the OpenStreetMap object behind it
 * (`datasource.raw.osm_type` + `osm_id`), not Geoapify's `place_id`: the latter encodes coordinates and differs
 * between Places and Place Details for the same object (GEOAPIFY_PROVIDER.md "Identity").
 */
export type GeoapifyPlaceDto = {
  osmType: OsmType;
  osmId: string;
  name: string;
  lat: number;
  lon: number;
  formatted?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  categories?: string[];
};

/** Geoapify's error body. `message` may echo the request and is never kept. */
export type GeoapifyErrorBody = { statusCode?: number; error?: string; message?: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

/**
 * Validates one GeoJSON feature. `null` when a field ROAM cannot do without is missing or invalid (OpenStreetMap
 * identity, name, coordinates); optional fields of the wrong type are dropped, never guessed.
 */
export function parseGeoapifyFeature(value: unknown): GeoapifyPlaceDto | null {
  if (!isObject(value) || !isObject(value.properties)) return null;
  const properties = value.properties;
  const datasource = isObject(properties.datasource) ? properties.datasource : undefined;
  const raw = datasource && isObject(datasource.raw) ? datasource.raw : undefined;
  if (!raw) return null;

  const osmType =
    typeof raw.osm_type === 'string' && Object.hasOwn(OSM_TYPES, raw.osm_type)
      ? OSM_TYPES[raw.osm_type as keyof typeof OSM_TYPES]
      : undefined;
  const osmId =
    typeof raw.osm_id === 'number' && Number.isSafeInteger(raw.osm_id)
      ? String(raw.osm_id)
      : typeof raw.osm_id === 'string' && /^\d+$/.test(raw.osm_id)
        ? raw.osm_id
        : undefined;
  if (!osmType || !osmId) return null;

  const name = optionalString(properties.name);
  if (!name) return null;
  const { lat, lon } = properties;
  if (typeof lat !== 'number' || lat < -90 || lat > 90) return null;
  if (typeof lon !== 'number' || lon < -180 || lon > 180) return null;

  return {
    osmType,
    osmId,
    name,
    lat,
    lon,
    formatted: optionalString(properties.formatted),
    addressLine1: optionalString(properties.address_line1),
    addressLine2: optionalString(properties.address_line2),
    city: optionalString(properties.city),
    categories: stringList(properties.categories),
  };
}

/**
 * Validates a FeatureCollection: `{ type: 'FeatureCollection', features: unknown[] }`. `null` when the body itself
 * is not that shape; features that fail validation are counted in `skipped`, not returned.
 */
export function parseFeatureCollection(
  value: unknown,
): { places: GeoapifyPlaceDto[]; skipped: number } | null {
  if (!isObject(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features))
    return null;
  const places = value.features.map(parseGeoapifyFeature);
  const valid = places.filter((place): place is GeoapifyPlaceDto => place !== null);
  return { places: valid, skipped: places.length - valid.length };
}
