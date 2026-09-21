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
