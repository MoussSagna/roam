import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import MapView, { type MapPressEvent } from 'react-native-maps';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import { FOCUS_DELTA, getFocusedRegion, getRegionForCoordinates } from '../lib/region';
import type { MapFocusInsets, MapMarkerData, MapRegion } from '../types/map.types';

import { ExperienceMarker } from './ExperienceMarker';

/**
 * Apple Maps (iOS) reports one tap on a marker **twice**: the marker's `onPress`, then the map's
 * `onPress` as if bare map had been tapped. `react-native-maps`' map tap recognizer
 * (`AIRMapManager.handleMapTap`) has no marker hit-test and recognizes simultaneously with the
 * marker's; it also waits for its double-tap recognizer to fail, so this echo always comes *after*
 * the marker press (~300 ms). A map press this soon after a marker press is that echo, not a new tap.
 */
const MARKER_TAP_ECHO_MS = 600;

/** Camera glide to a newly selected marker: short, like the marker's own selection pop. */
const FOCUS_MS = 350;

type RoamMapProps = {
  markers: readonly MapMarkerData[];
  selectedMarkerId?: string | null;
  onPressMarker?: (id: string) => void;
  /** A tap on the bare map (not a marker) — screens use it to clear the selection. */
  onPressMap?: () => void;
  /** `false` for an edge-to-edge map with no rounded corners (Search's full-screen map mode, sprint 8)
   * — a prop rather than an overriding `className`, since NativeWind doesn't resolve class conflicts
   * by order (`docs/DEVELOPMENT.md`). Default `true` (the standalone Map screen's card look). */
  rounded?: boolean;
  /** `false` for a static preview (Experience detail's map block): pan/zoom off and touches pass
   * through to whatever wraps the map (a `Pressable` that opens the full-screen map). Default `true`. */
  interactive?: boolean;
  /** Opt-in camera focus (Experience map, sprint 9): when set, the map opens on the selected marker
   * and glides to it whenever the selection changes (or the selected marker is tapped again),
   * keeping the current zoom and centering it in the area left between these insets — so it never
   * ends up under a floating header or footer. Without it the map never moves by itself (D-70). */
  focusInsets?: MapFocusInsets;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * ROAM's map surface (`docs/DECISIONS.md` D-70): the only place that talks to `react-native-maps`, so
 * screens stay decoupled from the vendor (`04_TECH_STACK.md`: "the provider abstraction should keep the
 * rest of the application independent"). It draws markers, frames them on first render and reports
 * taps — nothing more; selection state and what a tap *means* belong to the screen. With
 * `focusInsets` it also moves the camera to the selected marker (sprint 9). The frame keeps
 * the rounded corners of whatever card it sits in (`overflow-hidden` on the wrapper).
 */
export function RoamMap({
  markers,
  selectedMarkerId = null,
  onPressMarker,
  onPressMap,
  rounded = true,
  interactive = true,
  focusInsets,
  style,
  testID = 'roam-map',
}: RoamMapProps) {
  const { scheme } = useTheme();
  const reduceMotion = useReduceMotion();
  const mapRef = useRef<MapView>(null);
  const [mapHeight, setMapHeight] = useState(0);
  // Framed once, on mount: later marker changes must not yank the camera from under the user. A
  // focused map opens on its selected marker instead (re-centered for the insets once laid out).
  const [initialRegion] = useState<MapRegion>(() => {
    const focused = focusInsets && markers.find((marker) => marker.id === selectedMarkerId);
    if (focused) {
      return { ...focused.coordinate, latitudeDelta: FOCUS_DELTA, longitudeDelta: FOCUS_DELTA };
    }
    return getRegionForCoordinates(markers.map((marker) => marker.coordinate));
  });
  // Where the camera currently is (updated after every pan/zoom), so focusing keeps the user's zoom.
  const regionRef = useRef(initialRegion);
  const hasFocusedRef = useRef(false);

  // Latest values for the (stable) press handler and the focus effect, without re-rendering markers.
  const latest = useRef({
    markers,
    selectedMarkerId,
    onPressMarker,
    onPressMap,
    focusInsets,
    mapHeight,
  });
  useLayoutEffect(() => {
    latest.current = {
      markers,
      selectedMarkerId,
      onPressMarker,
      onPressMap,
      focusInsets,
      mapHeight,
    };
  });
  const lastMarkerPressAt = useRef<number | null>(null);

  const focusOn = useCallback(
    (id: string | null) => {
      const { markers: current, focusInsets: insets, mapHeight: height } = latest.current;
      const marker = id ? current.find((item) => item.id === id) : undefined;
      if (!insets || !marker || height === 0) return;
      // The first focus only corrects the opening frame for the insets: instant, not a visible move.
      const duration = !hasFocusedRef.current || reduceMotion ? 0 : FOCUS_MS;
      hasFocusedRef.current = true;
      mapRef.current?.animateToRegion(
        getFocusedRegion(marker.coordinate, regionRef.current, height, insets),
        duration,
      );
    },
    [reduceMotion],
  );

  // A new selection (or the map's first layout, or a change of the chrome around it) → focus.
  const focusTop = focusInsets?.top;
  const focusBottom = focusInsets?.bottom;
  useEffect(() => {
    focusOn(selectedMarkerId);
  }, [focusOn, selectedMarkerId, mapHeight, focusTop, focusBottom]);

  // Stable across renders, so memoized markers don't all re-render on every selection change.
  const handlePressMarker = useCallback(
    (id: string) => {
      // Re-tapping the selected marker (after panning away) brings it back to the center.
      lastMarkerPressAt.current = Date.now();
      if (id === latest.current.selectedMarkerId) focusOn(id);
      latest.current.onPressMarker?.(id);
    },
    [focusOn],
  );

  // Only a genuine tap on bare map reaches the screen: without this guard, on iOS every marker tap
  // was followed by `onPressMap` — hiding the footer / clearing the selection just made.
  const handlePressMap = useCallback((event: MapPressEvent) => {
    const markerPressAt = lastMarkerPressAt.current;
    lastMarkerPressAt.current = null;
    if (event.nativeEvent.action === 'marker-press') return;
    if (markerPressAt !== null && Date.now() - markerPressAt < MARKER_TAP_ECHO_MS) return;
    latest.current.onPressMap?.();
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => setMapHeight(event.nativeEvent.layout.height),
    [],
  );
  const handleRegionChangeComplete = useCallback((region: MapRegion) => {
    regionRef.current = region;
  }, []);

  return (
    <View
      testID={testID}
      className={cx('flex-1 overflow-hidden', rounded && 'rounded-large')}
      style={style}
      pointerEvents={interactive ? 'auto' : 'none'}
      onLayout={handleLayout}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        // Apple Maps follows this; Google Maps (Android) keeps its native light style — see D-70.
        userInterfaceStyle={scheme}
        onPress={handlePressMap}
        onRegionChangeComplete={handleRegionChangeComplete}
        toolbarEnabled={false}
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
      >
        {markers.map((marker) => (
          <ExperienceMarker
            key={marker.id}
            marker={marker}
            selected={marker.id === selectedMarkerId}
            onPress={handlePressMarker}
          />
        ))}
      </MapView>
    </View>
  );
}
