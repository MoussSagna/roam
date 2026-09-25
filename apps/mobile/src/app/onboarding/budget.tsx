import { OnboardingPager } from '@/features/onboarding/OnboardingPager';

/** Opens the question pager directly on this slide. */
export default function BudgetRoute() {
  return <OnboardingPager initialStep="budget" />;
}
