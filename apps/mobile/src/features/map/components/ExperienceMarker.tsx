import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { useTheme } from '@/theme';

import type { MapMarkerData } from '../types/map.types';

const PIN_SIZE = 28;
/** How long a marker keeps re-rasterizing its custom view after it changes (see `useTracksViewChanges`). */
const TRACK_MS = 300;

/**
 * `react-native-maps` snapshots a marker's children into a bitmap; leaving `tracksViewChanges` on
 * forever re-snapshots every frame (battery, jank) but turning it off from the start can freeze a
 * blank/stale bitmap. Track briefly after mount and whenever `selected` flips, then stop.
 */
function useTracksViewChanges(selected: boolean) {
  // The `selected` value the marker was last settled on: tracking is on until it catches up.
  const [settledFor, setSettledFor] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettledFor(selected), TRACK_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  return settledFor !== selected;
}

type ExperienceMarkerProps = {
  marker: MapMarkerData;
  selected: boolean;
  onPress: (id: string) => void;
};

/** ROAM pin: the same round pin the illustrated map used (surface + dot, filled `primary` once selected). */
export function ExperienceMarker({ marker, selected, onPress }: ExperienceMarkerProps) {
  const { colors } = useTheme();
  const tracksViewChanges = useTracksViewChanges(selected);

  return (
    <Marker
      coordinate={marker.coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      accessibilityLabel={marker.title}
      onPress={() => onPress(marker.id)}
    >
      <View
        style={{
          width: PIN_SIZE,
          height: PIN_SIZE,
          borderRadius: PIN_SIZE / 2,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: selected ? colors.primaryForeground : colors.primary,
          }}
        />
      </View>
    </Marker>
  );
}
