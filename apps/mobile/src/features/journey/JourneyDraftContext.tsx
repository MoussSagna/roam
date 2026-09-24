import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type {
  JourneyBudget,
  JourneyContext,
  JourneyDraft,
  JourneyDuration,
  JourneyMood,
  JourneyStartLocation,
} from '@/types';

import { nextQuarterHour } from './lib/plan';

type JourneyDraftValue = {
  mood: JourneyMood | null;
  duration: JourneyDuration | null;
  budget: JourneyBudget | null;
  startLocation: JourneyStartLocation | null;
  /** Ordered experience ids of the journey being built. */
  experienceIds: string[];
  /** Whether the suggestions screen already filled the selection (so going back to it keeps edits). */
  selectionInitialized: boolean;
  startTime: string;
  /** The user entered something: leaving now asks for confirmation. */
  hasInput: boolean;
  setMood: (mood: JourneyMood) => void;
  setDuration: (duration: JourneyDuration) => void;
  setBudget: (budget: JourneyBudget) => void;
  setStartLocation: (location: JourneyStartLocation) => void;
  initializeSelection: (ids: string[]) => void;
  toggleExperience: (id: string) => void;
  removeExperience: (id: string) => void;
  moveExperience: (from: number, to: number) => void;
  /** Complete context, or `null` while a question is unanswered. */
  context: JourneyContext | null;
  /** What "Créer mon parcours" saves, or `null` while incomplete. */
  toDraft: () => JourneyDraft | null;
};

const JourneyDraftContext = createContext<JourneyDraftValue | null>(null);

type JourneyDraftProviderProps = {
  children: ReactNode;
  /** Opened from an experience's "Créer mon parcours": it starts in the selection. */
  seedExperienceId?: string;
};

/**
 * `DRAFT_JOURNEY` (sprint 10): everything the creation flow collects, in memory only. Mounted by the
 * `/journey/create` layout, so it lives exactly as long as the flow — quitting the flow discards it
 * and never touches the active journey (`journeyStore`), which only changes on "Créer mon parcours".
 */
export function JourneyDraftProvider({ children, seedExperienceId }: JourneyDraftProviderProps) {
  const [mood, setMoodState] = useState<JourneyMood | null>(null);
  const [duration, setDurationState] = useState<JourneyDuration | null>(null);
  const [budget, setBudgetState] = useState<JourneyBudget | null>(null);
  const [startLocation, setStartLocationState] = useState<JourneyStartLocation | null>(null);
  const [experienceIds, setExperienceIds] = useState<string[]>(
    seedExperienceId ? [seedExperienceId] : [],
  );
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [startTime] = useState(() => nextQuarterHour(new Date()));

  const touch = useCallback(() => setHasInput(true), []);

  const setMood = useCallback(
    (value: JourneyMood) => {
      touch();
      setMoodState(value);
    },
    [touch],
  );
  const setDuration = useCallback(
    (value: JourneyDuration) => {
      touch();
      setDurationState(value);
    },
    [touch],
  );
  const setBudget = useCallback(
    (value: JourneyBudget) => {
      touch();
      setBudgetState(value);
    },
    [touch],
  );
  const setStartLocation = useCallback(
    (value: JourneyStartLocation) => {
      touch();
      setStartLocationState(value);
    },
    [touch],
  );

  const initializeSelection = useCallback((ids: string[]) => {
    setExperienceIds((current) => [...new Set([...current, ...ids])]);
    setSelectionInitialized(true);
  }, []);

  const toggleExperience = useCallback(
    (id: string) => {
      touch();
      setExperienceIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    },
    [touch],
  );

  const removeExperience = useCallback(
    (id: string) => {
      touch();
      setExperienceIds((current) => current.filter((item) => item !== id));
    },
    [touch],
  );

  const moveExperience = useCallback(
    (from: number, to: number) => {
      touch();
      setExperienceIds((current) => {
        if (to < 0 || to >= current.length || from === to) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [touch],
  );

  const context = useMemo<JourneyContext | null>(
    () => (mood && duration && budget ? { mood, duration, budget } : null),
    [mood, duration, budget],
  );

  const toDraft = useCallback(
    (): JourneyDraft | null =>
      context && startLocation && experienceIds.length > 0
        ? { context, startLocation, startTime, experienceIds }
        : null,
    [context, startLocation, startTime, experienceIds],
  );

  const value = useMemo<JourneyDraftValue>(
    () => ({
      mood,
      duration,
      budget,
      startLocation,
      experienceIds,
      selectionInitialized,
      startTime,
      hasInput,
      setMood,
      setDuration,
      setBudget,
      setStartLocation,
      initializeSelection,
      toggleExperience,
      removeExperience,
      moveExperience,
      context,
      toDraft,
    }),
    [
      mood,
      duration,
      budget,
      startLocation,
      experienceIds,
      selectionInitialized,
      startTime,
      hasInput,
      setMood,
      setDuration,
      setBudget,
      setStartLocation,
      initializeSelection,
      toggleExperience,
      removeExperience,
      moveExperience,
      context,
      toDraft,
    ],
  );

  return <JourneyDraftContext.Provider value={value}>{children}</JourneyDraftContext.Provider>;
}

export function useJourneyDraft(): JourneyDraftValue {
  const value = useContext(JourneyDraftContext);
  if (!value) throw new Error('useJourneyDraft must be used within a JourneyDraftProvider');
  return value;
}
