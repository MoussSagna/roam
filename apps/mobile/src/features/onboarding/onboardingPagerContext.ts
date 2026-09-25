import { createContext, useContext } from 'react';

import type { OnboardingStep } from './onboardingFlow';

/**
 * What the onboarding pager (`OnboardingPager`) shares with the screens it hosts. Kept in its own module
 * so `onboardingFlow.ts` and `ProgressBars` can read it without importing the pager (which imports the
 * screens, which import them).
 *
 * Two contexts on purpose: the actions never change, so a screen reading them (through
 * `useOnboardingNavigation`) does not re-render when the current slide changes; only the consumers of
 * the index (`ProgressBars`) do.
 */
export type OnboardingPagerActions = {
  /** Scrolls to `step` and returns true when it is one of the pager's slides, false otherwise. */
  goToStep: (step: OnboardingStep) => boolean;
};

export const OnboardingPagerActionsContext = createContext<OnboardingPagerActions | null>(null);

/** The pager's `currentIndex` (0-based slide index), or null outside the pager. */
export const OnboardingPagerIndexContext = createContext<number | null>(null);

export function useOnboardingPagerActions() {
  return useContext(OnboardingPagerActionsContext);
}

export function useOnboardingPagerIndex() {
  return useContext(OnboardingPagerIndexContext);
}
