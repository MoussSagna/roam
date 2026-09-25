import { useCallback, useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { JourneyFeedback, JourneyRating } from '@/types';

/** Comment length limit (the "58/300" counter of the feedback reference). */
export const FEEDBACK_COMMENT_MAX_LENGTH = 300;

export class JourneyNotCompletedError extends Error {
  constructor() {
    super('Feedback can only be given on a completed journey');
  }
}

/**
 * Feedback after a completed journey (sprint 12): `Screen -> this -> JourneyFeedbackRepository ->
 * mock`. The journey must be `completed` (the existing status, set by "Terminer mon parcours"); the
 * feedback is tied to it and to the current user. A blank comment is saved as `null`. The repository
 * keeps one feedback per journey, so a repeated submission never duplicates it.
 */
export async function submitJourneyFeedback({
  journeyId,
  rating,
  comment,
}: {
  journeyId: string;
  rating: JourneyRating;
  comment: string;
}): Promise<JourneyFeedback> {
  const [current, history] = await Promise.all([
    repositories.journeys.getCurrent(),
    repositories.journeys.listCompleted(),
  ]);
  const journey = current?.id === journeyId ? current : history.find((j) => j.id === journeyId);
  if (!journey || journey.status !== 'completed') throw new JourneyNotCompletedError();

  const user = await repositories.users.getCurrentUser();
  const text = comment.trim().slice(0, FEEDBACK_COMMENT_MAX_LENGTH);
  return repositories.journeyFeedback.submit({
    journeyId,
    userId: user.id,
    rating,
    comment: text.length > 0 ? text : null,
  });
}

/** The feedback already given for a journey, if any (loading / error / retry). */
export function useJourneyFeedback(journeyId: string | undefined) {
  const [feedback, setFeedback] = useState<JourneyFeedback | null>(null);
  // No id (a malformed link): nothing to load.
  const [isLoading, setIsLoading] = useState(journeyId !== undefined);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!journeyId) return;
    let active = true;
    repositories.journeyFeedback
      .getForJourney(journeyId)
      .then((result) => {
        if (!active) return;
        setFeedback(result);
        setError(false);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [journeyId, attempt]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  return { feedback, setFeedback, isLoading, error, retry };
}
