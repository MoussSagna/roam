import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewProps } from 'react-native';

/**
 * Jest stand-in for `react-native-maps` (native views don't exist under Jest). Registered globally in
 * `jest.setup.ts`, so any test rendering a `RoamMap` gets this: `MapView` renders a `View` that keeps
 * its props (so a test can read `initialRegion`, `userInterfaceStyle`…) and forwards `onPress`;
 * each `Marker` is a pressable named after its `accessibilityLabel`, rendering its children. Camera
 * commands sent through the map's ref land in `mockAnimateToRegion` (clear it in `beforeEach`).
 */
export const mockAnimateToRegion = jest.fn();

type MockMarkerProps = ViewProps & { onPress?: () => void; children?: ReactNode };

export function Marker({ onPress, children, ...props }: MockMarkerProps) {
  return (
    <Pressable {...props} accessibilityRole="button" onPress={onPress}>
      {children}
    </Pressable>
  );
}

const MapView = forwardRef<unknown, ViewProps & { children?: ReactNode }>(function MapView(
  { children, ...props },
  ref,
) {
  useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }), []);

  return (
    <View testID="mock-map-view" {...props}>
      {children}
    </View>
  );
});

export default MapView;
