import { Stack } from 'expo-router';

import { useAuth } from '@/auth';

/**
 * The whole app's route table, gated by the mocked session (`useAuth`): `Stack.Protected` (not a
 * plain redirect) so that flipping `isLoggedIn` removes the other flow from navigation history
 * outright, instead of just navigating on top of it — the back button can no longer reach it either
 * (sprint 3 "mocked auth session flow", `docs/DECISIONS.md`).
 *
 * Extracted from `app/_layout.tsx` so route tests can mount the exact same guarded stack (with a
 * lightweight `TestLayout` in place of the real one, which also handles font/theme bootstrap).
 */
export function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding/mood" />
        <Stack.Screen name="onboarding/time" />
        <Stack.Screen name="onboarding/budget" />
        <Stack.Screen name="onboarding/location" />
        <Stack.Screen name="onboarding/interests" />
        <Stack.Screen name="onboarding/profile-creation" />
        <Stack.Screen name="onboarding/ready" />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/reset-code" />
        <Stack.Screen name="auth/new-password" />
        <Stack.Screen name="auth/reset-success" />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="experience/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
