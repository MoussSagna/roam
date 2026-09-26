import { Injectable } from '@nestjs/common';

import type { Audience } from '../../generated/prisma/enums.js';
import type { Experience } from '../catalog/catalog.types.js';
import { type ExperienceFilter, ExperienceRepository } from '../catalog/experience.repository.js';
import { type Budget, BUDGET_CEILING_EUR } from '../experiences/api-values.js';
import type { User, UserPreference } from '../users/user.repository.js';
import { UsersService } from '../users/users.service.js';
import { boundingBox, distanceMeters, type Point } from './geo.js';

export type Company = 'alone' | 'couple' | 'friends' | 'family';

/** What the user asks for now (RECOMMENDATION.md → "User context"); every field optional. */
export type RecommendationRequest = {
  location?: Point;
  maxDistanceKm?: number;
  budget?: Budget;
  availableMinutes?: number;
  company?: Company;
  category?: string;
  limit?: number;
};

/** The context actually applied: the request, completed by the saved preferences (`fromPreferences`). */
export type AppliedContext = {
  location: Point | null;
  maxDistanceKm: number | null;
  budget: Budget | null;
  availableMinutes: number | null;
  company: Company | null;
  category: string | null;
  fromPreferences: ('budget' | 'maxDistanceKm' | 'company')[];
};

/** A constraint that can be relaxed, in the order RECOMMENDATION.md lists them ("No perfect match": budget, distance, time, preference). */
export type Constraint = 'budget' | 'distance' | 'duration' | 'company';
const RELAX_ORDER: readonly Constraint[] = ['budget', 'distance', 'duration', 'company'];

/** Why an item is proposed — only constraints it actually matched (RECOMMENDATION.md → "Why recommendation"). */
export type Reason = 'nearby' | 'budget' | 'duration' | 'company';

export type Recommendation = {
  experience: Experience;
  distanceM: number | null;
  reasons: Reason[];
};

export type Recommendations = {
  context: AppliedContext;
  items: Recommendation[];
  /** Empty when every item passed every constraint; otherwise the constraints dropped to find alternatives. */
  relaxed: Constraint[];
};

/** How many candidates one query may bring back (the Paris MVP catalog is small; see the document's limits). */
export const CANDIDATE_LIMIT = 200;
export const DEFAULT_LIMIT = 10;
/** "Nearby" as the mobile suggestions define it (journey `suggest.ts`): ≤ 2 km, and a smaller bonus ≤ 5 km. */
export const NEAR_M = 2000;
export const CLOSE_M = 5000;

const AUDIENCE: Record<Company, Audience> = {
  alone: 'SOLO',
  couple: 'COUPLE',
  friends: 'FRIENDS',
  family: 'FAMILY',
};

const BUDGET_FROM_PREFERENCE: Record<NonNullable<UserPreference['usualBudget']>, Budget> = {
  FREE: 'free',
  UNDER_10: 'under10',
  FROM_10_TO_25: '10to25',
  FROM_25_TO_50: '25to50',
  OVER_50: '50plus',
};

const COMPANY_FROM_PREFERENCE: Record<NonNullable<UserPreference['usualCompany']>, Company> = {
  ALONE: 'alone',
  COUPLE: 'couple',
  FRIENDS: 'friends',
  FAMILY: 'family',
};

/**
 * The first recommendation layer (EXPERIENCE_CATALOG_API.md → "Recommendations"): context → candidates → hard
 * filters → deterministic ranking → reasons. No mood matching (no shared mood vocabulary with the catalog yet),
 * no opening-hours check (hours are stored in provider-specific shapes), no learned weights.
 */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly experiences: ExperienceRepository,
    private readonly users: UsersService,
  ) {}

  async recommend(me: User, request: RecommendationRequest): Promise<Recommendations> {
    const context = applyPreferences(request, await this.users.getPreferences(me));
    const limit = request.limit ?? DEFAULT_LIMIT;

    // Everything first. If nothing fits: one constraint dropped at a time, in the documented order (the closest
    // alternatives — "12 € instead of your 10 €"); only then all of them together.
    for (const relaxed of relaxations(context)) {
      const items = await this.run(context, new Set(relaxed));
      if (items.length > 0) return { context, items: items.slice(0, limit), relaxed };
    }
    // Nothing at all, even without any constraint: an empty catalog (for this category).
    return { context, items: [], relaxed: [] };
  }

  private async run(context: AppliedContext, relaxed: Set<Constraint>): Promise<Recommendation[]> {
    const radiusM = distanceLimitM(context, relaxed);
    const filter: ExperienceFilter = {
      categorySlug: context.category ?? undefined,
      maxPrice:
        context.budget && !relaxed.has('budget') ? BUDGET_CEILING_EUR[context.budget] : undefined,
      area:
        context.location && radiusM !== null ? boundingBox(context.location, radiusM) : undefined,
    };
    const candidates = await this.experiences.findCandidates(filter, CANDIDATE_LIMIT);

    return candidates
      .map((experience) => ({ experience, distanceM: distanceTo(experience, context.location) }))
      .filter(({ experience, distanceM }) =>
        passes(experience, distanceM, context, relaxed, radiusM),
      )
      .map(({ experience, distanceM }) => ({
        experience,
        distanceM,
        reasons: reasonsFor(experience, distanceM, context),
      }))
      .sort(byRank);
  }
}

// ─── The rules, as pure functions (unit-tested) ────────────────────────────────────────────────────

/** The request wins; the saved preferences fill what it leaves out (budget, distance, company). */
export function applyPreferences(
  request: RecommendationRequest,
  preference: UserPreference | null,
): AppliedContext {
  const fromPreferences: AppliedContext['fromPreferences'] = [];
  let budget = request.budget ?? null;
  if (!budget && preference?.usualBudget) {
    budget = BUDGET_FROM_PREFERENCE[preference.usualBudget];
    fromPreferences.push('budget');
  }
  let maxDistanceKm = request.maxDistanceKm ?? null;
  // A distance needs a point to measure from: the preference only applies with a location.
  if (maxDistanceKm === null && request.location && preference?.maxDistanceKm) {
    maxDistanceKm = preference.maxDistanceKm;
    fromPreferences.push('maxDistanceKm');
  }
  let company = request.company ?? null;
  if (!company && preference?.usualCompany) {
    company = COMPANY_FROM_PREFERENCE[preference.usualCompany];
    fromPreferences.push('company');
  }
  return {
    location: request.location ?? null,
    maxDistanceKm,
    budget,
    availableMinutes: request.availableMinutes ?? null,
    company,
    category: request.category ?? null,
    fromPreferences,
  };
}

/** The attempts, in order: none relaxed, each active constraint alone, then all active ones (if several). */
export function relaxations(context: AppliedContext): Constraint[][] {
  const active = RELAX_ORDER.filter((constraint) => isActive(constraint, context));
  return [[], ...active.map((constraint) => [constraint]), ...(active.length > 1 ? [active] : [])];
}

function isActive(constraint: Constraint, context: AppliedContext): boolean {
  switch (constraint) {
    case 'budget':
      return context.budget !== null && BUDGET_CEILING_EUR[context.budget] !== undefined;
    case 'distance':
      return context.location !== null && context.maxDistanceKm !== null;
    case 'duration':
      return context.availableMinutes !== null;
    case 'company':
      return context.company !== null;
  }
}

function distanceLimitM(context: AppliedContext, relaxed: Set<Constraint>): number | null {
  if (relaxed.has('distance') || context.maxDistanceKm === null) return null;
  return context.maxDistanceKm * 1000;
}

function distanceTo(experience: Experience, location: Point | null): number | null {
  if (!location || experience.latitude === null || experience.longitude === null) return null;
  return distanceMeters(location, {
    latitude: experience.latitude,
    longitude: experience.longitude,
  });
}

/**
 * Hard filters (RECOMMENDATION.md → "Candidate filtering"): only a known fact that breaks a constraint excludes —
 * an unknown distance, duration or audience never does. (Budget is filtered by the query.)
 */
export function passes(
  experience: Experience,
  distanceM: number | null,
  context: AppliedContext,
  relaxed: ReadonlySet<Constraint>,
  radiusM: number | null,
): boolean {
  if (radiusM !== null && distanceM !== null && distanceM > radiusM) return false;

  const duration = experience.enrichment?.estimatedDurationMin ?? null;
  if (
    !relaxed.has('duration') &&
    context.availableMinutes !== null &&
    duration !== null &&
    duration > context.availableMinutes
  ) {
    return false;
  }

  const suitableFor = experience.enrichment?.suitableFor ?? [];
  const audienceKnown = suitableFor.length > 0 && !suitableFor.includes('UNKNOWN');
  if (
    !relaxed.has('company') &&
    context.company !== null &&
    audienceKnown &&
    !suitableFor.includes(AUDIENCE[context.company])
  ) {
    return false;
  }
  return true;
}

/** Only the constraints the item actually matched with known facts. */
export function reasonsFor(
  experience: Experience,
  distanceM: number | null,
  context: AppliedContext,
): Reason[] {
  const reasons: Reason[] = [];
  if (distanceM !== null && distanceM <= NEAR_M) reasons.push('nearby');
  const ceiling = context.budget ? BUDGET_CEILING_EUR[context.budget] : undefined;
  if (ceiling !== undefined && experience.priceMin !== null && experience.priceMin <= ceiling) {
    reasons.push('budget');
  }
  const duration = experience.enrichment?.estimatedDurationMin ?? null;
  if (
    context.availableMinutes !== null &&
    duration !== null &&
    duration <= context.availableMinutes
  ) {
    reasons.push('duration');
  }
  if (context.company && experience.enrichment?.suitableFor.includes(AUDIENCE[context.company])) {
    reasons.push('company');
  }
  return reasons;
}

/**
 * The ranking of the mobile journey suggestions (`suggest.ts`, RECOMMENDATION.md → "Current implementation")
 * without its mood term: +2 within 2 km, +1 within 5 km, + rating / 10. Ties: nearest, then id — a stable order.
 */
export function score(item: Pick<Recommendation, 'experience' | 'distanceM'>): number {
  const { distanceM } = item;
  const proximity = distanceM === null ? 0 : distanceM <= NEAR_M ? 2 : distanceM <= CLOSE_M ? 1 : 0;
  return proximity + (item.experience.rating ?? 0) / 10;
}

export function byRank(a: Recommendation, b: Recommendation): number {
  return (
    score(b) - score(a) ||
    (a.distanceM ?? Number.POSITIVE_INFINITY) - (b.distanceM ?? Number.POSITIVE_INFINITY) ||
    a.experience.id.localeCompare(b.experience.id)
  );
}
