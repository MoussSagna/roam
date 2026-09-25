import { PAGER_STEPS, type PagerStep } from './onboardingFlow';

/**
 * The answers to the onboarding questions, held by the pager for the prototype (nothing is saved, D-28).
 * Nothing is selected at first: every question needs an answer before moving on (D-88).
 */
export type OnboardingAnswers = {
  mood: string | null;
  time: string | null;
  budget: string | null;
  location: string | null;
  interests: ReadonlySet<string>;
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  mood: null,
  time: null,
  budget: null,
  location: null,
  interests: new Set(),
};

/**
 * The one validation rule of the questions: a choice is made (at least one interest). "Suivant" and the
 * swipe both go through it.
 */
export function isStepComplete(step: PagerStep, answers: OnboardingAnswers): boolean {
  return step === 'interests' ? answers.interests.size > 0 : answers[step] !== null;
}

/**
 * Index of the last slide the user may reach: the first question still to answer (or the last one).
 * The pager only lists the slides up to it, so a swipe cannot go past it.
 */
export function lastReachableIndex(answers: OnboardingAnswers): number {
  const firstIncomplete = PAGER_STEPS.findIndex((step) => !isStepComplete(step, answers));
  return firstIncomplete === -1 ? PAGER_STEPS.length - 1 : firstIncomplete;
}
