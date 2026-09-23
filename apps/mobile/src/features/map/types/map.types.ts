import type { Coordinates } from '@/types';

/** A point of interest drawn on a `RoamMap`. Vendor-agnostic: no `react-native-maps` type leaks out. */
export type MapMarkerData = {
  id: string;
  /** Accessible name of the marker (also the experience title for experience markers). */
  title: string;
  coordinate: Coordinates;
};

/** Visible area of the map, in the same shape `react-native-maps` expects for `initialRegion`. */
export type MapRegion = Coordinates & {
  latitudeDelta: number;
  longitudeDelta: number;
};
