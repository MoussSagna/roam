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
 *
 * **Back navigation is button-only by default** (`gestureEnabled: false` on `screenOptions`, sprint 5
 * "disable native back gesture" — `docs/DECISIONS.md` D-53): the native edge-swipe/interactive-pop
 * gesture is off for every screen unless explicitly re-enabled below. The handful of screens with no
 * back button of their own — where that gesture (or the Android hardware back button, which this
 * setting does not affect) is genuinely the only way back — keep it on; each is a pre-existing,
 * documented design choice, not a new exception. Do not add a screen to this list without the same
 * "no back button exists" justification.
 */
export function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="welcome" />
        {/* No back button on any of these (`onboarding.welcome.eyebrow`… through "ready"): the
            mockup has none, and going back a step is the native gesture / hardware button only
            (`DECISIONS.md` D-21). "ready" also relies on it to reach "interests" (D-27's "back from
            ready goes to the interests", since "profile-creation" is `replace`d out of history). */}
        <Stack.Screen name="onboarding/mood" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/time" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/budget" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/location" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/interests" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/profile-creation" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/ready" options={{ gestureEnabled: true }} />
        {/* Also no back button (D-29: "the mockup's Login/Register/Forgot-password tiles all have
            it, Entry doesn't") — the gesture is the only way back to Welcome. */}
        <Stack.Screen name="auth/index" options={{ gestureEnabled: true }} />
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
        <Stack.Screen name="gallery/[id]" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="map" />
        <Stack.Screen name="itinerary/create" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/preferences" />
        <Stack.Screen name="profile/favorites" />
        <Stack.Screen name="profile/history" />
        <Stack.Screen name="profile/statistics" />
        <Stack.Screen name="profile/language" />
        <Stack.Screen name="profile/theme" />
        <Stack.Screen name="profile/help" />
        <Stack.Screen name="profile/privacy" />
        <Stack.Screen name="profile/settings" />
      </Stack.Protected>
    </Stack>
  );
}
