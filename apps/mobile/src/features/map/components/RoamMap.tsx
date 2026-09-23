import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import MapView from 'react-native-maps';

import { useTheme } from '@/theme';

import { getRegionForCoordinates } from '../lib/region';
import type { MapMarkerData } from '../types/map.types';

import { ExperienceMarker } from './ExperienceMarker';

type RoamMapProps = {
  markers: readonly MapMarkerData[];
  selectedMarkerId?: string | null;
  onPressMarker?: (id: string) => void;
  /** A tap on the bare map (not a marker) — screens use it to clear the selection. */
  onPressMap?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * ROAM's map surface (`docs/DECISIONS.md` D-70): the only place that talks to `react-native-maps`, so
 * screens stay decoupled from the vendor (`04_TECH_STACK.md`: "the provider abstraction should keep the
 * rest of the application independent"). It draws markers, frames them on first render and reports
 * taps — nothing more; selection state and what a tap *means* belong to the screen. The frame keeps
 * the rounded corners of whatever card it sits in (`overflow-hidden` on the wrapper).
 */
export function RoamMap({
  markers,
  selectedMarkerId = null,
  onPressMarker,
  onPressMap,
  style,
  testID = 'roam-map',
}: RoamMapProps) {
  const { scheme } = useTheme();
  // Framed once, on mount: later marker changes must not yank the camera from under the user.
  const [initialRegion] = useState(() =>
    getRegionForCoordinates(markers.map((marker) => marker.coordinate)),
  );

  return (
    <View testID={testID} className="flex-1 overflow-hidden rounded-large" style={style}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        // Apple Maps follows this; Google Maps (Android) keeps its native light style — see D-70.
        userInterfaceStyle={scheme}
        onPress={onPressMap}
        toolbarEnabled={false}
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {markers.map((marker) => (
          <ExperienceMarker
            key={marker.id}
            marker={marker}
            selected={marker.id === selectedMarkerId}
            onPress={(id) => onPressMarker?.(id)}
          />
        ))}
      </MapView>
    </View>
  );
}
