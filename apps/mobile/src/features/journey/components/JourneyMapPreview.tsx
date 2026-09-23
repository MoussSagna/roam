import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { RoamMap } from '@/features/map/components/RoamMap';
import { toMapMarkers } from '@/features/map/lib/markers';
import type { MapMarkerData } from '@/features/map/types/map.types';
import type { Experience, JourneyStartLocation } from '@/types';

type JourneyMapPreviewProps = {
  experiences: readonly Experience[];
  start?: JourneyStartLocation | null;
  /** Highlighted step (the current one of an active journey). */
  selectedExperienceId?: string | null;
  height?: number;
};

const START_MARKER_ID = 'journey-start';

/** Small, static `RoamMap` of a journey: the start point and one photo marker per step, framed
 * together. Reuses the one map surface of the app (D-70) — no second map. */
export function JourneyMapPreview({
  experiences,
  start,
  selectedExperienceId = null,
  height = 180,
}: JourneyMapPreviewProps) {
  const { t } = useTranslation();
  const markers = useMemo<MapMarkerData[]>(
    () => [
      ...(start
        ? [
            {
              id: START_MARKER_ID,
              title: t('journey.location.startPoint'),
              coordinate: start.coordinates,
            },
          ]
        : []),
      ...toMapMarkers(experiences),
    ],
    [experiences, start, t],
  );
  // `RoamMap` frames its markers once: remount it when the set of points changes.
  const key = markers.map((marker) => marker.id).join('|');

  return (
    <View testID="journey-map" style={{ height }}>
      <RoamMap
        key={key}
        markers={markers}
        selectedMarkerId={selectedExperienceId}
        interactive={false}
      />
    </View>
  );
}
