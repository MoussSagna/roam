import type { Coordinates } from '@/types';

import type { MapFocusInsets, MapRegion } from '../types/map.types';

/** Paris, used when there is nothing to frame (empty data). */
export const DEFAULT_REGION: MapRegion = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const MIN_DELTA = 0.02;
/** Extra room around the outermost points so no pin sits flush against the map's edge. */
const PADDING_FACTOR = 1.5;

/** Smallest region that frames every coordinate, with breathing room; `DEFAULT_REGION` when empty. */
export function getRegionForCoordinates(coordinates: readonly Coordinates[]): MapRegion {
  if (coordinates.length === 0) return DEFAULT_REGION;

  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(MIN_DELTA, (maxLat - minLat) * PADDING_FACTOR),
    longitudeDelta: Math.max(MIN_DELTA, (maxLng - minLng) * PADDING_FACTOR),
  };
}

/** Zoom of a map that opens focused on one marker: a neighbourhood, close enough for nearby pins to
 * be told apart. */
export const FOCUS_DELTA = 0.04;

/**
 * Region that puts `coordinate` at the center of the map's *useful* area — between `insets.top` (a
 * floating header) and `insets.bottom` (a footer) — keeping the zoom of `region`. The latitude is
 * shifted by the half-difference of the insets, converted from pixels with the region's own
 * degrees-per-pixel (linear: the Mercator error is negligible at street/neighbourhood zooms).
 */
export function getFocusedRegion(
  coordinate: Coordinates,
  region: MapRegion,
  mapHeight: number,
  insets: MapFocusInsets,
): MapRegion {
  const offsetPx = mapHeight > 0 ? (insets.top - insets.bottom) / 2 : 0;
  const latitudePerPx = mapHeight > 0 ? region.latitudeDelta / mapHeight : 0;

  return {
    latitude: coordinate.latitude + offsetPx * latitudePerPx,
    longitude: coordinate.longitude,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  };
}
