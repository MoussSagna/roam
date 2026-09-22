import { Stack } from 'expo-router';

import { ReadyScreen } from '@/features/onboarding/ReadyScreen';

export default function ReadyRoute() {
  return (
    <>
      {/* Reached by itself from the profile creation: a fade, not a slide. */}
      <Stack.Screen options={{ animation: 'fade' }} />
      <ReadyScreen />
    </>
  );
}
