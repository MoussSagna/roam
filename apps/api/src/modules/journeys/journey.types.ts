import type {
  JourneyBudget,
  JourneyDuration,
  JourneyMood,
  JourneyStartKind,
  JourneyStatus,
  TravelMode,
} from '../../generated/prisma/enums.js';

/**
 * The journey as the domain sees it (JOURNEY.md "Model", mobile `Journey`): what the journey repository
 * returns and accepts — never a Prisma type. Planning values (arrivals, travel, totals) are computed by the
 * journey service; the repository only stores them.
 */
export type JourneyStartLocation = {
  kind: JourneyStartKind;
  label: string;
  detail: string | null;
  latitude: number;
  longitude: number;
};

export type JourneyStep = {
  experienceId: string;
  /** 0-based position: the index of the step in `Journey.steps`. */
  order: number;
  /** "HH:MM" */
  estimatedArrival: string;
  estimatedDurationMin: number;
  travelDurationMin: number;
  travelDistanceM: number;
  travelMode: TravelMode;
};

export type Journey = {
  id: string;
  userId: string;
  status: JourneyStatus;
  title: string;
  mood: JourneyMood;
  duration: JourneyDuration;
  budget: JourneyBudget;
  startLocation: JourneyStartLocation;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  estimatedDurationMin: number;
  estimatedBudgetEur: number;
  totalDistanceM: number;
  /** 0-based index of the step in progress. */
  currentStep: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Ordered by `order`. */
  steps: JourneyStep[];
};

/** A step to store: its position is its index in the list. */
export type JourneyStepInput = Omit<JourneyStep, 'order'>;

/** The planning totals, recomputed by the service whenever the steps change. */
export type JourneyPlan = {
  endTime: string;
  estimatedDurationMin: number;
  estimatedBudgetEur: number;
  totalDistanceM: number;
};

/** A new journey: created ACTIVE (a draft is never saved — JOURNEY.md), with its ordered steps. */
export type NewJourney = JourneyPlan & {
  userId: string;
  title: string;
  mood: JourneyMood;
  duration: JourneyDuration;
  budget: JourneyBudget;
  startLocation: Omit<JourneyStartLocation, 'detail'> & { detail?: string | null };
  startTime: string;
  startedAt: Date;
  steps: JourneyStepInput[];
};

/** Feedback on a completed journey (FEEDBACK.md "Implemented"). */
export type JourneyFeedback = {
  id: string;
  journeyId: string;
  userId: string;
  /** 1–5 */
  rating: number;
  comment: string | null;
  createdAt: Date;
};

export type NewJourneyFeedback = Pick<JourneyFeedback, 'journeyId' | 'userId' | 'rating'> & {
  comment?: string | null;
};

/**
 * The user already has an ACTIVE journey (JOURNEY.md: at most one). Raised by the repository when PostgreSQL's
 * partial unique index refuses the insert — the case the journey service's own check cannot see (two
 * concurrent creations).
 */
export class ActiveJourneyExistsError extends Error {
  constructor() {
    super('The user already has an active journey');
    this.name = 'ActiveJourneyExistsError';
  }
}

/** The journey already has its feedback (one per journey). */
export class JourneyFeedbackExistsError extends Error {
  constructor() {
    super('The journey already has a feedback');
    this.name = 'JourneyFeedbackExistsError';
  }
}
