import { useEffect, useSyncExternalStore } from 'react';

import { repositories } from '@/services';
import type { Experience, Journey, JourneyDraft, JourneyState } from '@/types';

import { buildPlan } from './lib/plan';

/**
 * The current journey, shared by every screen that shows or changes it (Experience detail's CTA, the
 * active journey screen, the creation flow's final step): `Screen -> this store -> JourneyRepository
 * -> mock`. A tiny external store rather than a new provider in the root layout — the same "one source
 * of truth, many readers" role `useSyncExternalStore` is made for. Every mutation goes through the
 * repository first, then updates the snapshot, so the UI never shows something that wasn't saved.
 */
export type JourneySnapshot = {
  journey: Journey | null;
  /** Completed journeys, most recent first (sprint 11) — may include the current one once done. */
  history: Journey[];
  isLoading: boolean;
  error: boolean;
};

const INITIAL: JourneySnapshot = { journey: null, history: [], isLoading: true, error: false };

let snapshot: JourneySnapshot = INITIAL;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setSnapshot(next: Partial<JourneySnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads the current journey and the history once (again after an error, or when `force`d). */
export function loadJourney(force = false): Promise<void> {
  if (loading && !force) return loading;
  setSnapshot({ isLoading: true, error: false });
  loading = Promise.all([repositories.journeys.getCurrent(), repositories.journeys.listCompleted()])
    .then(([journey, history]) => setSnapshot({ journey, history, isLoading: false, error: false }))
    .catch(() => {
      loading = null;
      setSnapshot({ isLoading: false, error: true });
    });
  return loading;
}

export function journeyStateOf(journey: Journey | null): JourneyState {
  if (!journey) return 'none';
  return journey.status === 'completed' ? 'completed' : 'active';
}

/** A journey by id: the current one, or one from the history (`/journey/[id]` opens both). */
export function findJourney(
  { journey, history }: Pick<JourneySnapshot, 'journey' | 'history'>,
  id: string | undefined,
): Journey | null {
  if (!id) return null;
  if (journey?.id === id) return journey;
  return history.find((item) => item.id === id) ?? null;
}

/** The current journey + its state (`none` | `active` | `completed`) and the history, loaded on first
 * use. */
export function useJourney() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    void loadJourney();
  }, []);
  return { ...current, state: journeyStateOf(current.journey), reload: () => loadJourney(true) };
}

async function experiencesById(ids: readonly string[]): Promise<Experience[]> {
  const pool = await repositories.experiences.list();
  return ids
    .map((id) => pool.find((experience) => experience.id === id))
    .filter((experience): experience is Experience => experience !== undefined);
}

/** Recomputes arrivals, travel and totals after the steps changed; keeps everything else. */
async function replan(journey: Journey, experienceIds: readonly string[]): Promise<Journey> {
  const experiences = await experiencesById(experienceIds);
  const plan = buildPlan(experiences, journey.startLocation, journey.startTime);
  return {
    ...journey,
    steps: plan.steps,
    endTime: plan.endTime,
    estimatedDurationMin: plan.estimatedDurationMin,
    estimatedBudgetEur: plan.estimatedBudgetEur,
    totalDistanceM: plan.totalDistanceM,
    currentStep: Math.min(journey.currentStep, Math.max(0, plan.steps.length - 1)),
  };
}

async function persist(journey: Journey): Promise<Journey> {
  const saved = await repositories.journeys.save(journey);
  const history =
    saved.status === 'completed' ? await repositories.journeys.listCompleted() : snapshot.history;
  setSnapshot({ journey: saved, history, isLoading: false, error: false });
  return saved;
}

async function currentActive(): Promise<Journey | null> {
  await loadJourney();
  const journey = snapshot.journey;
  return journey && journey.status === 'active' ? journey : null;
}

export class ActiveJourneyExistsError extends Error {
  constructor() {
    super('An active journey already exists');
  }
}

/** DRAFT → ACTIVE. Refuses to create a second active journey (MVP: one at a time); a completed one
 * is replaced as the current journey but stays in the history. */
export async function createJourney(draft: JourneyDraft, title: string): Promise<Journey> {
  if (await currentActive()) throw new ActiveJourneyExistsError();
  const experiences = await experiencesById(draft.experienceIds);
  const plan = buildPlan(experiences, draft.startLocation, draft.startTime);
  return persist({
    id: `journey-${Date.now()}`,
    status: 'active',
    title,
    createdAt: new Date().toISOString(),
    context: draft.context,
    startLocation: draft.startLocation,
    startTime: draft.startTime,
    currentStep: 0,
    startedAt: null,
    completedAt: null,
    ...plan,
  });
}

/** Whether an experience is one of the journey's steps — the one membership check, used by
 * `addExperienceToJourney` (no duplicates) and Experience detail's CTA (hidden once it's in). Ids are
 * compared as strings, never objects. */
export function isExperienceInJourney(
  journey: Journey | null | undefined,
  experienceId: string | null | undefined,
): boolean {
  if (!journey || experienceId == null) return false;
  return journey.steps.some((step) => String(step.experienceId) === String(experienceId));
}

export type AddResult = 'added' | 'alreadyAdded' | 'noActiveJourney';

/** Adds an experience at the end of the active journey — never creates one, never duplicates. */
export async function addExperienceToJourney(experienceId: string): Promise<AddResult> {
  const journey = await currentActive();
  if (!journey) return 'noActiveJourney';
  if (isExperienceInJourney(journey, experienceId)) return 'alreadyAdded';
  const ids = journey.steps.map((step) => step.experienceId);
  await persist(await replan(journey, [...ids, experienceId]));
  return 'added';
}

export async function removeJourneyStep(index: number): Promise<void> {
  const journey = await currentActive();
  if (!journey) return;
  const ids = journey.steps.map((step) => step.experienceId).filter((_, i) => i !== index);
  const shifted = index < journey.currentStep ? journey.currentStep - 1 : journey.currentStep;
  await persist(await replan({ ...journey, currentStep: shifted }, ids));
}

export async function moveJourneyStep(from: number, to: number): Promise<void> {
  const journey = await currentActive();
  if (!journey || to < 0 || to >= journey.steps.length || from === to) return;
  const ids = journey.steps.map((step) => step.experienceId);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);
  await persist(await replan(journey, ids));
}

/** "Commencer": the journey is under way, at its first step. */
export async function startJourney(): Promise<void> {
  const journey = await currentActive();
  if (!journey || journey.startedAt) return;
  await persist({ ...journey, startedAt: new Date().toISOString(), currentStep: 0 });
}

/** The current step is done: move on, or complete the journey after the last one. Returns the saved
 * journey (`status: 'completed'` once it is over — the moment the feedback is asked, sprint 12), or
 * `null` when there was nothing to progress. */
export async function completeCurrentStep(): Promise<Journey | null> {
  const journey = await currentActive();
  if (!journey || !journey.startedAt) return null;
  const next = journey.currentStep + 1;
  if (next >= journey.steps.length) {
    return persist({ ...journey, status: 'completed', completedAt: new Date().toISOString() });
  }
  return persist({ ...journey, currentStep: next });
}

/** Tests only: forget the cached snapshot (the repository is cleared separately). */
export function resetJourneyStoreForTests() {
  loading = null;
  snapshot = INITIAL;
  listeners.forEach((listener) => listener());
}
