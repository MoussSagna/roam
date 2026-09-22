import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/auth';

/**
 * Onboarding journey (design mockup, "Home Onboarding"):
 * Splash → welcome → mood → time → budget → location → interests → profile → ready → app.
 * The splash is a separate route (`/`); `welcome` is the first onboarding screen. `profile` is the animated
 * "profile creation" simulation (no backend): it moves on to `ready` by itself.
 */
export const ONBOARDING_STEPS = [
  'welcome',
  'mood',
  'time',
  'budget',
  'location',
  'interests',
  'profile',
  'ready',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** `welcome` keeps its original route so the splash → welcome transition is unchanged. */
export const ROUTES: Record<OnboardingStep, string> = {
  welcome: '/welcome',
  mood: '/onboarding/mood',
  time: '/onboarding/time',
  budget: '/onboarding/budget',
  location: '/onboarding/location',
  interests: '/onboarding/interests',
  profile: '/onboarding/profile-creation',
  ready: '/onboarding/ready',
};

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;
}

/** Where the journey ends: the app itself (the home screen is still a placeholder). */
export const HOME_ROUTE = '/home';

/** "Suivant" goes to the next step, "Passer" jumps to the final "ready" screen, "Commencer" enters the app. */
export function useOnboardingNavigation(step: OnboardingStep) {
  const router = useRouter();
  const { login } = useAuth();

  return {
    next: () => {
      const target = nextStep(step);
      if (target) router.push(ROUTES[target] as Href);
    },
    /** Replaces the current screen (the profile creation does not stay in the history). */
    replaceWithNext: () => {
      const target = nextStep(step);
      if (target) router.replace(ROUTES[target] as Href);
    },
    skip: () => router.replace(ROUTES.ready as Href),
    /**
     * Completing onboarding is this app's other "become a user" path, alongside Login/Register:
     * it marks the mocked session active the same way, so the guarded `(tabs)` routes are reachable
     * and Welcome/onboarding can't be reached again from the back button (sprint 3 §17).
     */
    finish: async () => {
      await login();
      router.replace(HOME_ROUTE as Href);
    },
  };
}
