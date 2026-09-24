import { useEffect, useRef, useState } from 'react';

import { PROFILE_STAGE, type ProfileStage } from '@/features/onboarding/profileCreation';

/**
 * "On prépare ton parcours" (sprint 12, D-84) is a front-end SIMULATION between "On part d'où ?" and
 * the suggestions — no request, nothing saved, the draft is only read. The same idea and shape as the
 * onboarding's profile creation (`profileCreation.ts`, D-27), shortened to about 3.5 s:
 *
 * 0 intro (logo, orbit) → 1–4 one draft line each (start, ambiance, time, budget) → 5 "Construction
 * de ton parcours" (pending) → 6 done (every line checked) → 7 leaving (fade out) → navigation.
 */
export const BUILD_PHASE = {
  intro: 0,
  start: 1,
  mood: 2,
  duration: 3,
  budget: 4,
  building: 5,
  done: 6,
  leaving: 7,
} as const;

export type BuildPhase = (typeof BUILD_PHASE)[keyof typeof BUILD_PHASE];

/** Milliseconds after arrival at which each phase starts, then when the suggestions open. */
export const BUILD_TIMELINE = {
  start: 350,
  mood: 850,
  duration: 1350,
  budget: 1850,
  building: 2350,
  done: 2950,
  leaving: 3350,
  navigate: 3650,
} as const;

const PHASE_STARTS: readonly (readonly [BuildPhase, number])[] = [
  [BUILD_PHASE.start, BUILD_TIMELINE.start],
  [BUILD_PHASE.mood, BUILD_TIMELINE.mood],
  [BUILD_PHASE.duration, BUILD_TIMELINE.duration],
  [BUILD_PHASE.budget, BUILD_TIMELINE.budget],
  [BUILD_PHASE.building, BUILD_TIMELINE.building],
  [BUILD_PHASE.done, BUILD_TIMELINE.done],
  [BUILD_PHASE.leaving, BUILD_TIMELINE.leaving],
];

/**
 * Runs the timeline once per mount and returns the current phase; `onFinish` is called once, at the
 * end. Every timer is cleared on unmount (leaving with the Android back button stops everything).
 */
export function useJourneyBuilding(onFinish: () => void): BuildPhase {
  const [phase, setPhase] = useState<BuildPhase>(BUILD_PHASE.intro);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    let finished = false;
    const timers = PHASE_STARTS.map(([next, at]) => setTimeout(() => setPhase(next), at));
    timers.push(
      setTimeout(() => {
        if (finished) return;
        finished = true;
        onFinishRef.current();
      }, BUILD_TIMELINE.navigate),
    );
    return () => {
      finished = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return phase;
}

/** The onboarding orbit (`ProfileOrbit`) is driven by profile stages: the journey phases map onto them. */
export function orbitStageFor(phase: BuildPhase): ProfileStage {
  if (phase >= BUILD_PHASE.leaving) return PROFILE_STAGE.leaving;
  if (phase >= BUILD_PHASE.done) return PROFILE_STAGE.done;
  if (phase >= BUILD_PHASE.budget) return PROFILE_STAGE.thirdStep;
  if (phase >= BUILD_PHASE.duration) return PROFILE_STAGE.secondStep;
  if (phase >= BUILD_PHASE.mood) return PROFILE_STAGE.firstStep;
  if (phase >= BUILD_PHASE.start) return PROFILE_STAGE.analyzing;
  return PROFILE_STAGE.intro;
}

/** The orbit's loader ring at the journey's pace (the onboarding's takes ~10 s). */
export const BUILD_RING_PROGRESS = {
  [PROFILE_STAGE.intro]: { to: 0, duration: 0 },
  [PROFILE_STAGE.analyzing]: { to: 0.2, duration: 500 },
  [PROFILE_STAGE.firstStep]: { to: 0.4, duration: 500 },
  [PROFILE_STAGE.secondStep]: { to: 0.6, duration: 500 },
  [PROFILE_STAGE.thirdStep]: { to: 0.9, duration: 1100 },
  [PROFILE_STAGE.done]: { to: 1, duration: 400 },
  [PROFILE_STAGE.leaving]: { to: 1, duration: 0 },
} as const satisfies Record<ProfileStage, { to: number; duration: number }>;
