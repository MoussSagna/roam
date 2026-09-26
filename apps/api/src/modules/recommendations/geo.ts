/** Plain latitude/longitude geometry (no PostGIS — DATABASE_SCHEMA.md → "Geography"). */

export type Point = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in meters (haversine) — the straight-line distance the mobile planning also uses. */
export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

/**
 * The latitude/longitude box that contains every point within `radiusM` of `center` — a cheap, index-friendly
 * pre-filter for the database; the exact distance is checked afterwards. (Not valid across the poles or the
 * antimeridian: out of the Paris MVP scope.)
 */
export function boundingBox(center: Point, radiusM: number) {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(toRadians(center.latitude)), 1e-6);
  return {
    minLatitude: center.latitude - dLat,
    maxLatitude: center.latitude + dLat,
    minLongitude: center.longitude - dLng,
    maxLongitude: center.longitude + dLng,
  };
}
