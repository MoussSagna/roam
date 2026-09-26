import { useRouter, type Href } from 'expo-router';

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

/**
 * The questions, shown as the slides of one horizontal pager (`OnboardingPager`, swipe or "Suivant") under
 * one fixed "Passer" and one fixed footer. Welcome, the profile creation (a timed simulation) and "ready"
 * stay separate screens.
 */
export const PAGER_STEPS = ['mood', 'time', 'budget', 'location', 'interests'] as const;

export type PagerStep = (typeof PAGER_STEPS)[number];

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

/** Where the journey ends: account creation, then the app (DATA-8). */
export const REGISTER_ROUTE = '/auth/register';

/**
 * "Suivant" goes to the next step, "Passer" jumps to the final "ready" screen, "Commencer" enters the app.
 * Between the questions, the pager (`OnboardingPager`) scrolls itself; it uses `next` from the last one.
 */
export function useOnboardingNavigation(step: OnboardingStep) {
  const router = useRouter();

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
     * Completing onboarding leads to account creation (DATA-8): a real session needs credentials, so
     * "Commencer" opens Register, which signs in and lands on Home — in API and mock mode alike. It used
     * to grant the mocked session directly (sprint 3 §17), which only a simulated backend allowed.
     * Pushed, not replaced: back returns to "Tout est prêt".
     */
    finish: async () => {
      router.push(REGISTER_ROUTE as Href);
    },
  };
}
