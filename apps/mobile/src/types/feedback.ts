/** Values mirror the i18n keys `feedback.love`, `feedback.like`, `feedback.meh`, `feedback.notForMe`. */
export type FeedbackRating = 'love' | 'like' | 'meh' | 'notForMe';

/** Values mirror the i18n keys `feedback.tooExpensive`, `feedback.tooFar`, … */
export type FeedbackReason =
  'tooExpensive' | 'tooFar' | 'tooCrowded' | 'notMyStyle' | 'atmosphere' | 'activity' | 'other';

export type Feedback = {
  id: string;
  userId: string;
  experienceId: string;
  rating: FeedbackRating;
  reasons: FeedbackReason[];
  /** ISO 8601 date. */
  createdAt: string;
};

/** A journey's overall rating (sprint 12): 1 to 5 stars. */
export type JourneyRating = 1 | 2 | 3 | 4 | 5;

/**
 * The feedback given after a completed journey ("parcours", sprint 12): a star rating and an optional
 * comment. At most one per journey. Distinct from the per-experience `Feedback` above (the MVP's
 * love/like/meh/not-for-me, not built yet).
 */
export type JourneyFeedback = {
  id: string;
  journeyId: string;
  userId: string;
  rating: JourneyRating;
  /** `null` when the user left no comment. */
  comment: string | null;
  /** ISO 8601 date. */
  createdAt: string;
};

/** What a submission hands to the repository (it assigns `id` and `createdAt`). */
export type JourneyFeedbackInput = Pick<
  JourneyFeedback,
  'journeyId' | 'userId' | 'rating' | 'comment'
>;
