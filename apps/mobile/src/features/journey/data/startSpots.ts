import type { Coordinates } from '@/types';

/**
 * Starting points offered by "Choisir un lieu" (sprint 10) — plain mock content like the trending
 * chips: no places search or geocoding yet, so a short list of well-known Paris spots stands in.
 */
export const START_SPOTS: readonly { id: string; label: string; coordinates: Coordinates }[] = [
  { id: 'republique', label: 'République', coordinates: { latitude: 48.8674, longitude: 2.3637 } },
  { id: 'chatelet', label: 'Châtelet', coordinates: { latitude: 48.8583, longitude: 2.347 } },
  { id: 'montmartre', label: 'Montmartre', coordinates: { latitude: 48.8867, longitude: 2.3431 } },
  { id: 'bastille', label: 'Bastille', coordinates: { latitude: 48.8532, longitude: 2.3691 } },
  {
    id: 'saint-germain',
    label: 'Saint-Germain-des-Prés',
    coordinates: { latitude: 48.854, longitude: 2.3339 },
  },
  { id: 'canal', label: 'Canal Saint-Martin', coordinates: { latitude: 48.871, longitude: 2.365 } },
];
