import { Stack } from 'expo-router';

import { SearchSessionProvider } from './SearchSessionContext';

/**
 * Layout of the `/search` route group (D-72): mounts the shared `SearchSessionProvider` once, above
 * both `/search` (the list) and `/search/map` (`SearchMapScreen`), inside its own `Stack`.
 * A nested navigator doesn't inherit the root `Stack`'s `screenOptions`, so the project's "no native
 * swipe-back" default (`gestureEnabled: false`, D-53) is repeated here. The map opens with a fade —
 * a quiet transition into an immersive screen — rather than the default slide.
 */
export function SearchLayout() {
  return (
    <SearchSessionProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="map" options={{ animation: 'fade' }} />
      </Stack>
    </SearchSessionProvider>
  );
}
