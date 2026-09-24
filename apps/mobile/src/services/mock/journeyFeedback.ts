import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';
import type { JourneyFeedback } from '@/types';

import type { JourneyFeedbackRepository } from '../repositories/types';

/**
 * Mock journey feedback (sprint 12): no backend, so feedback is kept in memory by journey id and
 * persisted with the app's storage helper (`roam.journey.feedback`), like the journeys themselves.
 * One per journey: submitting again returns the saved one. Returns copies, like a real API would.
 */
export function createMockJourneyFeedbackRepository(): JourneyFeedbackRepository {
  let byJourney: Record<string, JourneyFeedback> | undefined;

  async function load(): Promise<Record<string, JourneyFeedback>> {
    if (byJourney !== undefined) return byJourney;
    const raw = await readStorage(STORAGE_KEYS.journeyFeedback);
    try {
      byJourney = raw ? (JSON.parse(raw) as Record<string, JourneyFeedback>) : {};
    } catch {
      byJourney = {};
    }
    return byJourney;
  }

  return {
    getForJourney: async (journeyId) => structuredClone((await load())[journeyId] ?? null),
    submit: async (input) => {
      const all = await load();
      const existing = all[input.journeyId];
      if (existing) return structuredClone(existing);
      const feedback: JourneyFeedback = {
        ...input,
        id: `feedback-${input.journeyId}`,
        createdAt: new Date().toISOString(),
      };
      byJourney = { ...all, [input.journeyId]: feedback };
      await writeStorage(STORAGE_KEYS.journeyFeedback, JSON.stringify(byJourney));
      return structuredClone(feedback);
    },
    clear: async () => {
      byJourney = {};
      await removeStorage(STORAGE_KEYS.journeyFeedback);
    },
  };
}
