import type { SourceEntityType } from '../generated/prisma/enums.js';

/**
 * Rules of the data model the services and repositories check before writing, to refuse with a clear error
 * (apps/api/apidocs/DATABASE_SCHEMA.md → "Constraints"). PostgreSQL guarantees the same rules for every
 * writer: CHECK constraints (rating, single targets — migration `check_constraints`), "HH:MM" excepted.
 *
 * Also checked by the journey service, not here (it needs a query): at most one ACTIVE journey per user
 * (JOURNEY.md), backed by the partial unique index `journeys_one_active_per_user`.
 */

/** Journey feedback: 1–5 stars, optional comment of at most 300 characters (FEEDBACK.md, mobile D-83). */
export const JOURNEY_FEEDBACK_RATING = { min: 1, max: 5 } as const;
export const JOURNEY_FEEDBACK_COMMENT_MAX_LENGTH = 300;

export function isValidJourneyRating(rating: number): boolean {
  return (
    Number.isInteger(rating) &&
    rating >= JOURNEY_FEEDBACK_RATING.min &&
    rating <= JOURNEY_FEEDBACK_RATING.max
  );
}

/** "HH:MM", 00:00–23:59 — journey start/end times and step arrivals (JOURNEY.md). */
export function isHourMinute(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

type SourceTargets = {
  entityType: SourceEntityType;
  placeId?: string | null;
  eventId?: string | null;
  experienceId?: string | null;
};

const TARGET_BY_TYPE = {
  PLACE: 'placeId',
  EVENT: 'eventId',
  EXPERIENCE: 'experienceId',
} as const satisfies Record<SourceEntityType, keyof SourceTargets>;

/** An `ExternalSource` points at exactly one record, the one its `entityType` names. */
export function hasSingleSourceTarget(source: SourceTargets): boolean {
  const set = (['placeId', 'eventId', 'experienceId'] as const).filter((key) => source[key]);
  return set.length === 1 && set[0] === TARGET_BY_TYPE[source.entityType];
}

/** A `RoamEnrichment` describes exactly one place or one experience. */
export function hasSingleEnrichmentTarget(enrichment: {
  placeId?: string | null;
  experienceId?: string | null;
}): boolean {
  return Boolean(enrichment.placeId) !== Boolean(enrichment.experienceId);
}
