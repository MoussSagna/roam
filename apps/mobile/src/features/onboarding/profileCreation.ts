import { useEffect, useRef, useState } from 'react';

/**
 * Profile creation is a front-end SIMULATION (no backend, no network, nothing is stored): a timeline of stages
 * that makes ROAM look like it is building the profile. See DECISIONS.md D-27.
 *
 * 0 intro (logo and orbit appear) → 1 analysing (loader starts) → 2, 3, 4 one checklist step each →
 * 5 done ("Ton profil est prêt") → 6 leaving (fade out) → navigation.
 */
export const PROFILE_STAGE = {
  intro: 0,
  analyzing: 1,
  firstStep: 2,
  secondStep: 3,
  thirdStep: 4,
  done: 5,
  leaving: 6,
} as const;

export type ProfileStage = (typeof PROFILE_STAGE)[keyof typeof PROFILE_STAGE];

/** Milliseconds after arrival at which each stage starts, then when the next screen is opened. */
export const PROFILE_TIMELINE = {
  analyzing: 2000,
  firstStep: 4000,
  secondStep: 6000,
  thirdStep: 8000,
  done: 9500,
  leaving: 10000,
  navigate: 10300,
} as const;

/** The checklist, in order: the label is `onboarding.profile.<key>`. */
export const PROFILE_STEPS = ['analysis', 'recommendations', 'experience'] as const;

const STAGE_STARTS: readonly (readonly [ProfileStage, number])[] = [
  [PROFILE_STAGE.analyzing, PROFILE_TIMELINE.analyzing],
  [PROFILE_STAGE.firstStep, PROFILE_TIMELINE.firstStep],
  [PROFILE_STAGE.secondStep, PROFILE_TIMELINE.secondStep],
  [PROFILE_STAGE.thirdStep, PROFILE_TIMELINE.thirdStep],
  [PROFILE_STAGE.done, PROFILE_TIMELINE.done],
  [PROFILE_STAGE.leaving, PROFILE_TIMELINE.leaving],
];

/**
 * Runs the timeline once per mount and returns the current stage; `onFinish` is called once, at the end.
 * Every timer is cleared on unmount, so leaving the screen (back gesture) stops everything, and coming back
 * starts a fresh sequence.
 */
export function useProfileCreation(onFinish: () => void): ProfileStage {
  const [stage, setStage] = useState<ProfileStage>(PROFILE_STAGE.intro);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    let finished = false;
    const timers = STAGE_STARTS.map(([next, at]) => setTimeout(() => setStage(next), at));
    timers.push(
      setTimeout(() => {
        if (finished) return;
        finished = true;
        onFinishRef.current();
      }, PROFILE_TIMELINE.navigate),
    );
    return () => {
      finished = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return stage;
}

/** How much of the loader ring is drawn while each stage plays, and how long the move takes. */
export const RING_PROGRESS = {
  [PROFILE_STAGE.intro]: { to: 0, duration: 0 },
  [PROFILE_STAGE.analyzing]: { to: 0.22, duration: 2000 },
  [PROFILE_STAGE.firstStep]: { to: 0.5, duration: 2000 },
  [PROFILE_STAGE.secondStep]: { to: 0.75, duration: 2000 },
  [PROFILE_STAGE.thirdStep]: { to: 0.97, duration: 1500 },
  [PROFILE_STAGE.done]: { to: 1, duration: 500 },
  [PROFILE_STAGE.leaving]: { to: 1, duration: 0 },
} as const satisfies Record<ProfileStage, { to: number; duration: number }>;
