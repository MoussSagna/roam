import { HttpStatus, Injectable } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { ApiException, ErrorCode } from '../../common/errors/api-error.js';
import type { Page, PageRequest } from '../../database/pagination.js';
import type {
  JourneyBudget,
  JourneyDuration,
  JourneyMood,
  JourneyStartKind,
} from '../../generated/prisma/enums.js';
import type { Experience } from '../catalog/catalog.types.js';
import { ExperienceRepository } from '../catalog/experience.repository.js';
import type { User } from '../users/user.repository.js';
import { buildPlan, currentStepAfterEdit, type PlannableExperience } from './journey-planning.js';
import { JourneyRepository } from './journey.repository.js';
import { ActiveJourneyExistsError, type Journey, type JourneyStep } from './journey.types.js';

/** The domain error codes of the journey API (JOURNEY_API.md → "Errors"). */
export const JourneyErrorCode = {
  AlreadyActive: 'JOURNEY_ALREADY_ACTIVE',
  NotActive: 'JOURNEY_NOT_ACTIVE',
  InvalidStep: 'JOURNEY_INVALID_STEP',
  ExperienceUnavailable: 'JOURNEY_EXPERIENCE_UNAVAILABLE',
} as const;

/** What the creation flow hands over (JOURNEY.md `JourneyDraft`) plus the title the app displays. */
export type JourneyDraft = {
  title: string;
  mood: JourneyMood;
  duration: JourneyDuration;
  budget: JourneyBudget;
  startLocation: {
    kind: JourneyStartKind;
    label: string;
    detail: string | null;
    latitude: number;
    longitude: number;
  };
  /** "HH:MM" */
  startTime: string;
  /** Ordered. */
  experienceIds: string[];
};

/** A step with the canonical experience it points at. */
export type JourneyStepDetail = JourneyStep & { experience: Experience };
export type JourneyDetail = Omit<Journey, 'steps'> & { steps: JourneyStepDetail[] };

export type UnavailableExperience = {
  experienceId: string;
  reason: 'notFound' | 'inactive' | 'noDuration';
};

/**
 * Journeys (JOURNEY.md, JOURNEY_API.md): the backend is the source of truth for the owner, the status, the progress
 * and the plan. A draft is never saved: a journey is created ACTIVE and started. Every read and write is scoped to
 * the session user — another user's journey is "not found".
 */
@Injectable()
export class JourneysService {
  constructor(
    private readonly journeys: JourneyRepository,
    private readonly experiences: ExperienceRepository,
    private readonly clock: Clock,
  ) {}

  async getActive(me: User): Promise<JourneyDetail | null> {
    const journey = await this.journeys.findActiveByUserId(me.id);
    return journey && (await this.withExperiences([journey]))[0];
  }

  async listCompleted(me: User, page: PageRequest): Promise<Page<JourneyDetail>> {
    const result = await this.journeys.listCompletedByUserId(me.id, page);
    return { items: await this.withExperiences(result.items), nextCursor: result.nextCursor };
  }

  async get(me: User, id: string): Promise<JourneyDetail> {
    return (await this.withExperiences([await this.owned(me, id)]))[0];
  }

  /** DRAFT → ACTIVE: planned from the draft, started now, at its first step. */
  async create(me: User, draft: JourneyDraft): Promise<JourneyDetail> {
    if (await this.journeys.findActiveByUserId(me.id)) throw alreadyActive();

    const ids = unique(draft.experienceIds);
    const plannable = await this.plannable(ids, new Set());
    const { steps, ...plan } = buildPlan(plannable, draft.startLocation, draft.startTime);
    try {
      const journey = await this.journeys.create({
        userId: me.id,
        title: draft.title,
        mood: draft.mood,
        duration: draft.duration,
        budget: draft.budget,
        startLocation: draft.startLocation,
        startTime: draft.startTime,
        startedAt: this.clock.now(),
        steps,
        ...plan,
      });
      return (await this.withExperiences([journey]))[0];
    } catch (error) {
      // Created concurrently: the partial unique index refused the second one.
      if (error instanceof ActiveJourneyExistsError) throw alreadyActive();
      throw error;
    }
  }

  /**
   * Replaces the steps of the active journey (JOURNEY.md "Editing"): same journey, same status, replanned from its
   * start; duplicate ids dropped; the current experience stays current wherever it moved.
   */
  async updateSteps(me: User, id: string, experienceIds: string[]): Promise<JourneyDetail> {
    const journey = await this.owned(me, id);
    if (journey.status !== 'ACTIVE') throw notActive();

    const before = journey.steps.map((step) => step.experienceId);
    const ids = unique(experienceIds);
    const plannable = await this.plannable(ids, new Set(before));
    const { steps, ...plan } = buildPlan(plannable, journey.startLocation, journey.startTime);
    const updated = await this.journeys.replaceSteps(id, {
      steps,
      plan,
      currentStep: currentStepAfterEdit(
        { experienceIds: before, currentStep: journey.currentStep },
        ids,
      ),
      expectedCurrentStep: journey.currentStep,
    });
    if (!updated) throw await this.changedMeanwhile(id);
    return (await this.withExperiences([updated]))[0];
  }

  /**
   * "Continuer mon parcours": the current step is done, the next one becomes current. Only one step forward;
   * repeating the request for the step already reached is a no-op (a retried request). The last step is finished
   * with `complete`.
   */
  async progress(me: User, id: string, currentStep: number): Promise<JourneyDetail> {
    const journey = await this.owned(me, id);
    if (journey.status !== 'ACTIVE') throw notActive();
    if (currentStep === journey.currentStep) return (await this.withExperiences([journey]))[0];
    if (currentStep !== journey.currentStep + 1 || currentStep >= journey.steps.length) {
      throw invalidStep(
        `The next step is ${journey.currentStep + 1} (of ${journey.steps.length}); ` +
          'the last step is finished by completing the journey.',
        journey,
      );
    }
    const updated = await this.journeys.updateProgress(id, currentStep, journey.currentStep);
    if (!updated) throw await this.changedMeanwhile(id);
    return (await this.withExperiences([updated]))[0];
  }

  /** "Terminer le parcours", at the last step: ACTIVE → COMPLETED, once (JOURNEY.md: every step done). */
  async complete(me: User, id: string): Promise<JourneyDetail> {
    const journey = await this.owned(me, id);
    if (journey.status !== 'ACTIVE') throw notActive();
    if (journey.currentStep !== journey.steps.length - 1) {
      throw invalidStep('The journey is completed from its last step.', journey);
    }
    const updated = await this.journeys.complete(id, this.clock.now(), journey.currentStep);
    if (!updated) throw await this.changedMeanwhile(id);
    return (await this.withExperiences([updated]))[0];
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

  private owned(me: User, id: string): Promise<Journey> {
    return findOwnedJourney(this.journeys, me, id);
  }

  /** A conditional write found nothing to change: the journey was completed or progressed meanwhile. */
  private async changedMeanwhile(id: string): Promise<ApiException> {
    const now = await this.journeys.findById(id);
    if (!now || now.status !== 'ACTIVE') return notActive();
    return invalidStep('The journey changed meanwhile: reload it.', now);
  }

  /**
   * The experiences of a plan, in order. Each must exist and have a known duration; an experience that is not
   * already in the journey must also be active ("no longer offered" — EXPERIENCE_CATALOG_API.md), while one the
   * journey already holds may stay after it was deactivated (journeys keep pointing at it).
   */
  private async plannable(ids: string[], kept: Set<string>): Promise<PlannableExperience[]> {
    const found = new Map((await this.experiences.findManyByIds(ids)).map((e) => [e.id, e]));
    const unavailable: UnavailableExperience[] = [];
    const plannable = ids.flatMap((id): PlannableExperience[] => {
      const experience = found.get(id);
      if (!experience) {
        unavailable.push({ experienceId: id, reason: 'notFound' });
        return [];
      }
      if (!experience.isActive && !kept.has(id)) {
        unavailable.push({ experienceId: id, reason: 'inactive' });
        return [];
      }
      const durationMin = experience.enrichment?.estimatedDurationMin ?? null;
      if (durationMin === null) {
        unavailable.push({ experienceId: id, reason: 'noDuration' });
        return [];
      }
      const { latitude, longitude, priceMin, priceMax } = experience;
      return [{ id, latitude, longitude, durationMin, priceMin, priceMax }];
    });
    if (unavailable.length > 0) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        JourneyErrorCode.ExperienceUnavailable,
        'Some experiences cannot be part of a journey.',
        unavailable,
      );
    }
    return plannable;
  }

  /** Journeys with their steps' experiences, fetched in one go for all of them (no query per step). */
  private async withExperiences(journeys: Journey[]): Promise<JourneyDetail[]> {
    const ids = unique(
      journeys.flatMap((journey) => journey.steps.map((step) => step.experienceId)),
    );
    const byId = new Map((await this.experiences.findManyByIds(ids)).map((e) => [e.id, e]));
    return journeys.map((journey) => ({
      ...journey,
      steps: journey.steps.map((step) => {
        const experience = byId.get(step.experienceId);
        // A step's experience cannot be deleted (foreign key RESTRICT): missing means a broken database.
        if (!experience)
          throw new Error(`Experience ${step.experienceId} of a journey step is missing`);
        return { ...step, experience };
      }),
    }));
  }
}

/**
 * The user's own journey; anything else — unknown, or another user's — is "not found" (never disclosed). Shared by the
 * journey and journey feedback services.
 */
export async function findOwnedJourney(
  journeys: JourneyRepository,
  me: User,
  id: string,
): Promise<Journey> {
  const journey = await journeys.findById(id);
  if (!journey || journey.userId !== me.id) {
    throw new ApiException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Journey not found.');
  }
  return journey;
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function alreadyActive(): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    JourneyErrorCode.AlreadyActive,
    'An active journey already exists: complete it first.',
  );
}

function notActive(): ApiException {
  return new ApiException(
    HttpStatus.CONFLICT,
    JourneyErrorCode.NotActive,
    'The journey is completed: it can no longer change.',
  );
}

function invalidStep(message: string, journey: Journey): ApiException {
  return new ApiException(HttpStatus.CONFLICT, JourneyErrorCode.InvalidStep, message, {
    currentStep: journey.currentStep,
    stepCount: journey.steps.length,
  });
}
