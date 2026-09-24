import { Image } from 'expo-image';
import { MotiView } from 'moti';
import { memo, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import type { MapMarkerData } from '../types/map.types';

/** Diameter of the round photo at rest. */
export const MARKER_SIZE = 48;
/** Scale of the selected marker (≈ 57 px): clearly bigger, still a "small" selection pop. */
export const MARKER_SELECTED_SCALE = 1.18;
/** The native marker's box: room for the selected scale and its shadow, so neither is clipped (Android
 * rasterizes the marker's view bounds). */
const MARKER_BOX = 68;
const BORDER_WIDTH = 3;
/** Step-number badge on the ring's top-right edge; stays inside `MARKER_BOX` even when selected. */
const BADGE_SIZE = 22;
const SELECT_MS = 200;
/** How long a marker keeps re-rasterizing its custom view after it changes (see `useTracksViewChanges`)
 * — longer than the selection animation, so the bitmap is taken once it has settled. */
const TRACK_MS = 300;

/**
 * `react-native-maps` snapshots a marker's children into a bitmap; leaving `tracksViewChanges` on
 * forever re-snapshots every frame (battery, jank) but turning it off from the start can freeze a
 * blank/stale bitmap. Track after mount and whenever `selected` flips (covers the scale animation),
 * and until the photo has loaded (else Android keeps a marker without its photo), then stop.
 */
function useTracksViewChanges(selected: boolean, hasImage: boolean) {
  // The `selected` value the marker was last settled on: tracking is on until it catches up.
  const [settledFor, setSettledFor] = useState<boolean | null>(null);
  const [imageReady, setImageReady] = useState(!hasImage);

  useEffect(() => {
    const timer = setTimeout(() => setSettledFor(selected), TRACK_MS);
    return () => clearTimeout(timer);
  }, [selected]);

  const onImageSettled = useCallback(() => setImageReady(true), []);

  return { tracksViewChanges: settledFor !== selected || !imageReady, onImageSettled };
}

type ExperienceMarkerProps = {
  marker: MapMarkerData;
  selected: boolean;
  onPress: (id: string) => void;
};

/**
 * ROAM map marker (sprint 9): a round photo of the experience (`marker.image`, its `coverImage`) in a
 * `surface` ring with a soft shadow, so it reads on any map tile in both themes. Selected: the ring
 * turns `primary` and the marker scales up (Moti, 200 ms; no animation under reduced motion) and is
 * drawn above its neighbours. Without an image it falls back to the former dot. With `marker.badge`
 * (a journey's step number, sprint 12) a small round label sits on the ring's edge — `primary` for the
 * current step (`highlighted`), `surface` otherwise. Memoized: a selection
 * change only re-renders the two markers whose `selected` flips (`RoamMap` passes a stable `onPress`).
 */
export const ExperienceMarker = memo(function ExperienceMarker({
  marker,
  selected,
  onPress,
}: ExperienceMarkerProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const { tracksViewChanges, onImageSettled } = useTracksViewChanges(selected, !!marker.image);

  return (
    <Marker
      coordinate={marker.coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 1 : 0}
      accessibilityLabel={marker.title}
      accessibilityState={{ selected }}
      onPress={() => onPress(marker.id)}
    >
      <View
        style={{
          width: MARKER_BOX,
          height: MARKER_BOX,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MotiView
          testID={`experience-marker-${marker.id}`}
          animate={{ scale: selected ? MARKER_SELECTED_SCALE : 1 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : SELECT_MS }}
          // Shadow on the animated wrapper, clipping on the inner ring: iOS drops a shadow under
          // `overflow: hidden`.
          style={{
            width: MARKER_SIZE,
            height: MARKER_SIZE,
            borderRadius: MARKER_SIZE / 2,
            backgroundColor: colors.surfaceElevated,
            shadowColor: colors.overlay,
            shadowOffset: { width: 0, height: selected ? 4 : 2 },
            shadowOpacity: selected ? 0.3 : 0.2,
            shadowRadius: selected ? 6 : 3,
            elevation: selected ? 6 : 3,
          }}
        >
          <View
            testID={`experience-marker-ring-${marker.id}`}
            style={{
              flex: 1,
              borderRadius: MARKER_SIZE / 2,
              borderWidth: BORDER_WIDTH,
              borderColor: selected ? colors.primary : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {marker.image ? (
              <Image
                testID={`experience-marker-image-${marker.id}`}
                source={marker.image}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                onLoad={onImageSettled}
                onError={onImageSettled}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }}
              />
            )}
          </View>
          {marker.badge ? (
            <View
              testID={`experience-marker-badge-${marker.id}`}
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                borderRadius: BADGE_SIZE / 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: marker.highlighted ? colors.surface : colors.primary,
                backgroundColor: marker.highlighted ? colors.primary : colors.surface,
              }}
            >
              <Text
                variant="caption"
                className={
                  marker.highlighted
                    ? 'font-bodySemibold text-primaryForeground'
                    : 'font-bodySemibold text-primary'
                }
                style={{ fontSize: 11, lineHeight: 14 }}
              >
                {marker.badge}
              </Text>
            </View>
          ) : null}
        </MotiView>
      </View>
    </Marker>
  );
});
