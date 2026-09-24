import type { Coordinates } from '@/types';

/** Up to 6 decimals (about 10 cm), trailing zeros dropped: `48.8566, 2.3522`. */
function formatDegrees(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** Plain, readable "latitude, longitude" — what "Copier les coordonnées GPS" puts on the clipboard. */
export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  return `${formatDegrees(latitude)}, ${formatDegrees(longitude)}`;
}

/** Universal link that iOS opens in Apple Plans. A plain URL — no Maps API, no key. */
export function getPlansUrl({ latitude, longitude }: Coordinates, label: string): string {
  return `https://maps.apple.com/?ll=${formatDegrees(latitude)},${formatDegrees(longitude)}&q=${encodeURIComponent(label)}`;
}

/** Google's documented "Maps URL": opens the Google Maps app when installed (iOS and Android),
 * otherwise the same place in the browser — so no separate "not installed" branch is needed. A URL,
 * not the Maps API: no key, no request from the app. */
export function getGoogleMapsUrl({ latitude, longitude }: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${formatDegrees(latitude)},${formatDegrees(longitude)}`;
}
