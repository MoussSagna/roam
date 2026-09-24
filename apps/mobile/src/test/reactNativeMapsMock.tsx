import { fireEvent, type screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewProps } from 'react-native';

/**
 * Jest stand-in for `react-native-maps` (native views don't exist under Jest). Registered globally in
 * `jest.setup.ts`, so any test rendering a `RoamMap` gets this: `MapView` renders a `View` that keeps
 * its props (so a test can read `initialRegion`, `userInterfaceStyle`…) and forwards `onPress`;
 * each `Marker` is a pressable named after its `accessibilityLabel`, rendering its children; a
 * `Polyline` is a `View` holding its `coordinates`. Camera
 * commands sent through the map's ref land in `mockAnimateToRegion` (clear it in `beforeEach`).
 */
export const mockAnimateToRegion = jest.fn();

type Element = ReturnType<typeof screen.getByTestId>;

type MockMarkerProps = ViewProps & { onPress?: () => void; children?: ReactNode };

export function Marker({ onPress, children, ...props }: MockMarkerProps) {
  return (
    <Pressable {...props} accessibilityRole="button" onPress={onPress}>
      {children}
    </Pressable>
  );
}

/** A route line: a `View` keeping its `coordinates`, so a test can read the drawn path. */
export function Polyline(props: ViewProps & { coordinates: unknown[] }) {
  return <View {...props} />;
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

/** Simulates the tap that Apple Maps sends to the map right after a marker tap (see `RoamMap`'s
 * `MARKER_TAP_ECHO_MS`): same shape as a bare-map press, no `action`. */
export async function pressMapEcho(map: Element) {
  await fireEvent.press(map, { nativeEvent: {} });
}

/** A *new* tap on bare map: moves the clock past `RoamMap`'s marker-tap echo window first, so it is
 * not mistaken for the echo of a marker tap made just before in the test. */
export async function pressBareMap(map: Element) {
  const now = Date.now();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(now + 10_000);
  try {
    await fireEvent.press(map, { nativeEvent: {} });
  } finally {
    clock.mockRestore();
  }
}
