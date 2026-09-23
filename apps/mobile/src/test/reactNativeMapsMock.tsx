import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { ViewProps } from 'react-native';

/**
 * Jest stand-in for `react-native-maps` (native views don't exist under Jest). Registered globally in
 * `jest.setup.ts`, so any test rendering a `RoamMap` gets this: `MapView` renders a `View` that keeps
 * its props (so a test can read `initialRegion`, `userInterfaceStyle`…) and forwards `onPress`;
 * each `Marker` is a pressable named after its `accessibilityLabel`, rendering its children.
 */
type MockMarkerProps = ViewProps & { onPress?: () => void; children?: ReactNode };

export function Marker({ onPress, children, ...props }: MockMarkerProps) {
  return (
    <Pressable {...props} accessibilityRole="button" onPress={onPress}>
      {children}
    </Pressable>
  );
}

export default function MapView({ children, ...props }: ViewProps & { children?: ReactNode }) {
  return (
    <View testID="mock-map-view" {...props}>
      {children}
    </View>
  );
}
