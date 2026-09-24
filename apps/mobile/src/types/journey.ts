import type { Coordinates, Mood } from './common';

/**
 * A ROAM "parcours" (sprint 10): an ordered outing made of several experiences.
 *
 * - `draft` — being built in the creation flow; lives only in memory (`JourneyDraftProvider`), never
 *   saved, so leaving the flow never touches the active journey.
 * - `active` — created with "Créer mon parcours"; the one journey experiences get added to (MVP: at
 *   most one at a time).
 * - `completed` — every step done.
 *
 * Screens read `JourneyState` (`none` | `active` | `completed`) derived from the saved journey.
 */
export type JourneyStatus = 'draft' | 'active' | 'completed';

export type JourneyState = 'none' | 'active' | 'completed';

/** Ambiances offered by the creation flow — a subset of the existing `Mood` vocabulary. */
export type JourneyMood = Extract<
  Mood,
  'calm' | 'discover' | 'food' | 'culture' | 'energetic' | 'romantic' | 'festive'
>;

export type JourneyDuration = '1h' | '2h' | '3h' | 'halfDay' | 'day';

/** `free` / `€` / `€€` / `€€€`. */
export type JourneyBudget = 'free' | 'low' | 'medium' | 'high';

export type JourneyContext = {
  mood: JourneyMood;
  duration: JourneyDuration;
  budget: JourneyBudget;
};

export type JourneyStartKind = 'current' | 'place' | 'address';

export type JourneyStartLocation = {
  kind: JourneyStartKind;
  /** Display label ("Ma position", "République", a typed address). */
  label: string;
  coordinates: Coordinates;
};

export type JourneyTravelMode = 'walk' | 'metro';

export type JourneyStep = {
  experienceId: string;
  /** 0-based position. */
  order: number;
  /** "HH:MM", computed from the journey's start time. */
  estimatedArrival: string;
  estimatedDurationMin: number;
  /** Travel from the previous step (or from the start location for the first one). */
  travelDurationMin: number;
  travelDistanceM: number;
  travelMode: JourneyTravelMode;
};

export type Journey = {
  id: string;
  status: Exclude<JourneyStatus, 'draft'>;
  title: string;
  /** ISO timestamp. */
  createdAt: string;
  context: JourneyContext;
  startLocation: JourneyStartLocation;
  /** "HH:MM". */
  startTime: string;
  /** "HH:MM". */
  endTime: string;
  estimatedDurationMin: number;
  /** Euros, estimated from each experience's budget bracket (mock data has no exact prices). */
  estimatedBudgetEur: number;
  totalDistanceM: number;
  steps: JourneyStep[];
  /** 0-based index of the step in progress; meaningful once `startedAt` is set. */
  currentStep: number;
  /** ISO timestamp, set by "Commencer". */
  startedAt: string | null;
  /** ISO timestamp, set when the last step is done. */
  completedAt: string | null;
};

/** What the creation flow hands to the repository. */
export type JourneyDraft = {
  context: JourneyContext;
  startLocation: JourneyStartLocation;
  startTime: string;
  /** Ordered. */
  experienceIds: string[];
};
