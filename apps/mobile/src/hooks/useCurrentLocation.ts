import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinates } from '@/types';

/**
 * Foreground location permission, as ROAM distinguishes it:
 * - `unknown`: never asked (the system prompt can be shown);
 * - `granted`;
 * - `denied`: refused, but the system prompt can still be shown again (Android);
 * - `blocked`: refused and the system will not ask again — only the device settings can change it.
 */
export type LocationPermission = 'unknown' | 'granted' | 'denied' | 'blocked';

export type CurrentLocationResult =
  | { status: 'located'; coordinates: Coordinates }
  | { status: 'denied' | 'blocked' | 'unavailable' };

/** Past this, the position is reported unavailable (no GPS fix indoors, services slow to answer…). */
export const LOCATION_TIMEOUT_MS = 10_000;

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'unknown';
  return response.canAskAgain ? 'denied' : 'blocked';
}

function isValidCoordinates({ latitude, longitude }: Coordinates) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** Reads the permission without prompting. */
export async function getLocationPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.getForegroundPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

/**
 * The user's current position, asking for the foreground permission only if it has never been decided
 * (or can still be asked again). Never asks for background location, never keeps a history: one read,
 * returned to the caller. Every failure (refusal, no fix, timeout, native error, odd coordinates) is a
 * result, never a throw.
 */
export async function requestCurrentLocation(): Promise<CurrentLocationResult> {
  let permission = await getLocationPermission();
  if (permission === 'blocked') return { status: 'blocked' };
  if (permission !== 'granted') {
    try {
      permission = toPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      return { status: 'unavailable' };
    }
    if (permission === 'blocked') return { status: 'blocked' };
    if (permission !== 'granted') return { status: 'denied' };
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      // Balanced (~100 m) is enough to find outings nearby; no need for a precise GPS fix.
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS);
      }),
    ]);
    if (!position) return { status: 'unavailable' };
    const coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    return isValidCoordinates(coordinates)
      ? { status: 'located', coordinates }
      : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * `requestCurrentLocation` for a screen: the current permission (read on mount, without prompting, so
 * the screen can explain before asking), a `locating` flag and one call at a time.
 */
export function useCurrentLocation() {
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [locating, setLocating] = useState(false);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void getLocationPermission().then((current) => {
      if (mounted.current) setPermission(current);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const locate = useCallback(async (): Promise<CurrentLocationResult | null> => {
    if (busy.current) return null;
    busy.current = true;
    setLocating(true);
    const result = await requestCurrentLocation();
    busy.current = false;
    if (mounted.current) {
      setLocating(false);
      setPermission(
        result.status === 'located' || result.status === 'unavailable'
          ? await getLocationPermission()
          : result.status,
      );
    }
    return result;
  }, []);

  return { permission, locating, locate };
}
