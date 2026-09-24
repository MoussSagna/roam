import type { ImageSourcePropType } from 'react-native';

import type { Coordinates } from '@/types';

/** A point of interest drawn on a `RoamMap`. Vendor-agnostic: no `react-native-maps` type leaks out. */
export type MapMarkerData = {
  id: string;
  /** Accessible name of the marker (also the experience title for experience markers). */
  title: string;
  coordinate: Coordinates;
  /** Photo drawn inside the round marker (the experience's own `coverImage`); a plain dot without it. */
  image?: ImageSourcePropType;
  /** Small label on the marker's edge — a journey step's number ("1", "2"…), sprint 12. */
  badge?: string;
  /** Draws the badge in `primary` (a journey's current step) instead of `surface`. */
  highlighted?: boolean;
};

/** Height (px) of the chrome floating over the map's top and bottom edges (a transparent header, a
 * footer…). A focused marker is centered in the area left between them, not under either. */
export type MapFocusInsets = {
  top: number;
  bottom: number;
};

/** Visible area of the map, in the same shape `react-native-maps` expects for `initialRegion`. */
export type MapRegion = Coordinates & {
  latitudeDelta: number;
  longitudeDelta: number;
};
