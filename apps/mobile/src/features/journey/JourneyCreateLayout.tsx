import { Stack, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';

import { JourneyDraftProvider } from './JourneyDraftContext';

/**
 * Layout of the `/journey/create` flow (sprint 10): mounts the draft (`JourneyDraftProvider`) once,
 * above every creation step, inside its own `Stack` — the same shape as Search's layout (D-72). A
 * nested navigator doesn't inherit the root's options, so "no native swipe-back" (D-53) is repeated.
 * Opened from an experience's "Créer mon parcours", that experience starts in the selection.
 */
export function JourneyCreateLayout() {
  const { experienceId } = useGlobalSearchParams<{ experienceId?: string }>();
  const [seed] = useState(experienceId);

  return (
    <JourneyDraftProvider seedExperienceId={seed}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="context" />
        <Stack.Screen name="location" />
        <Stack.Screen name="building" options={{ animation: 'fade' }} />
        <Stack.Screen name="suggestions" />
        <Stack.Screen name="builder" />
        <Stack.Screen name="summary" />
      </Stack>
    </JourneyDraftProvider>
  );
}
