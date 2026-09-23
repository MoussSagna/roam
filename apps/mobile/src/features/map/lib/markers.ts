import type { Experience } from '@/types';

import type { MapMarkerData } from '../types/map.types';

/** An experience that can actually be pinned: `coordinates` is optional on the domain type. Shared by
 * every screen that turns experiences into `RoamMap` markers (the standalone Map screen, Search's map
 * mode) so "no coordinates -> no pin, no crash" is defined once. */
export function isPinnable(
  experience: Experience,
): experience is Experience & { coordinates: NonNullable<Experience['coordinates']> } {
  return experience.coordinates !== undefined;
}

/** Vendor-agnostic markers for whatever experiences a screen wants pinned — those without
 * `coordinates` are silently left out (they still show up wherever else the screen lists them, e.g. a
 * results list; see `isPinnable`). */
export function toMapMarkers(experiences: readonly Experience[]): MapMarkerData[] {
  return experiences.filter(isPinnable).map((experience) => ({
    id: experience.id,
    title: experience.title,
    coordinate: experience.coordinates,
  }));
}
