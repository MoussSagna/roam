import type { OnboardingLocation } from './onboardingAnswers';

/** Props of a single-choice question slide: the pager holds the answer (`onboardingAnswers.ts`). */
export type SingleChoiceSlideProps = {
  selected: string | null;
  onSelect: (id: string) => void;
};

/** Props of the multiple-choice question slide (interests). */
export type MultipleChoiceSlideProps = {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
};

/** Props of the location slide: its answer is a place, not an option id. */
export type LocationSlideProps = {
  selected: OnboardingLocation | null;
  onSelect: (location: OnboardingLocation) => void;
};
