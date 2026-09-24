import type { MapMarkerData } from '@/features/map/types/map.types';
import type { Coordinates, Experience, Journey } from '@/types';

export const JOURNEY_START_MARKER_ID = 'journey-start';

export type JourneyMapData = {
  /** The start point, then one numbered photo marker per step, in the journey's order. */
  markers: MapMarkerData[];
  /** Start point → step 1 → step 2… (straight segments, like the plan's distances). */
  route: Coordinates[];
  /** The step in progress (the first one before "Commencer"), `null` once the journey is completed. */
  currentExperienceId: string | null;
};

/**
 * What the active journey's maps draw (sprint 12) — the hub's mini-map and `/journey/[id]/map` both
 * call this, so they can never disagree: `Journey → steps (ordered) → Experience → coordinates`.
 * A step whose experience is unknown or has no coordinates gets no marker (the same rule as
 * `toMapMarkers`, D-70) and is left out of the line; the numbers stay the steps' own.
 */
export function journeyMapData(
  journey: Journey,
  experiencesById: ReadonlyMap<string, Experience>,
  startTitle: string,
): JourneyMapData {
  const currentIndex =
    journey.status === 'completed' ? -1 : journey.startedAt ? journey.currentStep : 0;
  const markers: MapMarkerData[] = [
    {
      id: JOURNEY_START_MARKER_ID,
      title: startTitle,
      coordinate: journey.startLocation.coordinates,
    },
  ];
  const route: Coordinates[] = [journey.startLocation.coordinates];
  let currentExperienceId: string | null = null;

  journey.steps.forEach((step, index) => {
    const experience = experiencesById.get(step.experienceId);
    if (index === currentIndex) currentExperienceId = step.experienceId;
    if (!experience?.coordinates) return;
    markers.push({
      id: experience.id,
      title: `${index + 1}. ${experience.title}`,
      coordinate: experience.coordinates,
      image: experience.coverImage,
      badge: String(index + 1),
      highlighted: index === currentIndex,
    });
    route.push(experience.coordinates);
  });

  return { markers, route, currentExperienceId };
}
