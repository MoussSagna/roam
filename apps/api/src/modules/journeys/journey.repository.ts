import { Injectable } from '@nestjs/common';

import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist, UniqueConstraintError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  ActiveJourneyExistsError,
  type Journey,
  type JourneyPlan,
  type JourneyStepInput,
  type NewJourney,
} from './journey.types.js';

/** The partial unique index "one ACTIVE journey per user" (migration init, DATABASE_SCHEMA.md). */
const ONE_ACTIVE_PER_USER = 'journeys_one_active_per_user';

const WITH_STEPS = {
  steps: { orderBy: { order: 'asc' } },
} as const satisfies Prisma.JourneyInclude;

type JourneyRow = Prisma.JourneyGetPayload<{ include: typeof WITH_STEPS }>;

export function toJourney(row: JourneyRow): Journey {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    title: row.title,
    mood: row.mood,
    duration: row.duration,
    budget: row.budget,
    startLocation: {
      kind: row.startKind,
      label: row.startLabel,
      detail: row.startDetail,
      latitude: row.startLatitude,
      longitude: row.startLongitude,
    },
    startTime: row.startTime,
    endTime: row.endTime,
    estimatedDurationMin: row.estimatedDurationMin,
    estimatedBudgetEur: row.estimatedBudgetEur,
    totalDistanceM: row.totalDistanceM,
    currentStep: row.currentStep,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    steps: row.steps.map((step) => ({
      experienceId: step.experienceId,
      order: step.order,
      estimatedArrival: step.estimatedArrival,
      estimatedDurationMin: step.estimatedDurationMin,
      travelDurationMin: step.travelDurationMin,
      travelDistanceM: step.travelDistanceM,
      travelMode: step.travelMode,
    })),
  };
}

const stepRows = (steps: JourneyStepInput[]) => steps.map((step, order) => ({ ...step, order }));

/**
 * Persistence of the journey aggregate — a journey and its ordered steps, always read and written together
 * (JOURNEY.md). The journey service owns the rules (one active journey, transitions, `currentStep`, planning);
 * this repository stores, and guards its writes against concurrent changes:
 *
 * - `create` relies on the partial unique index for "one ACTIVE journey per user";
 * - `replaceSteps`, `updateProgress`, `complete` only write a journey that is still ACTIVE (a conditional
 *   update, atomic in PostgreSQL) and return `null` otherwise — the service decides what that means.
 */
@Injectable()
export class JourneyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Journey | null> {
    return persist(async () => {
      const row = await this.prisma.journey.findUnique({ where: { id }, include: WITH_STEPS });
      return row && toJourney(row);
    });
  }

  /** The user's ACTIVE journey — the lookup the partial unique index guarantees to be unique. */
  findActiveByUserId(userId: string): Promise<Journey | null> {
    return persist(async () => {
      const row = await this.prisma.journey.findUnique({
        where: { userId, status: 'ACTIVE' },
        include: WITH_STEPS,
      });
      return row && toJourney(row);
    });
  }

  /** The user's completed journeys (history), most recently completed first. */
  listCompletedByUserId(userId: string, page?: PageRequest): Promise<Page<Journey>> {
    return persist(async () => {
      const { limit, args } = pageArgs(page);
      const rows = await this.prisma.journey.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        include: WITH_STEPS,
        ...args,
      });
      return toPage(rows, limit, toJourney);
    });
  }

  /**
   * Creates an ACTIVE journey with its steps (one statement for Prisma: atomic). Throws
   * `ActiveJourneyExistsError` when the user already has one, even if created concurrently.
   */
  async create(journey: NewJourney): Promise<Journey> {
    const { startLocation, steps, ...fields } = journey;
    try {
      return await persist(async () =>
        toJourney(
          await this.prisma.journey.create({
            data: {
              ...fields,
              status: 'ACTIVE',
              startKind: startLocation.kind,
              startLabel: startLocation.label,
              startDetail: startLocation.detail ?? null,
              startLatitude: startLocation.latitude,
              startLongitude: startLocation.longitude,
              steps: { create: stepRows(steps) },
            },
            include: WITH_STEPS,
          }),
        ),
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError && error.constraint === ONE_ACTIVE_PER_USER) {
        throw new ActiveJourneyExistsError();
      }
      throw error;
    }
  }

  /**
   * Replaces the steps of an ACTIVE journey and its plan, in one transaction: the conditional update locks
   * the journey row, so concurrent edits run one after the other and no half-replaced list is ever visible.
   * Any failure (unknown experience, duplicate experience) rolls everything back. `null` when the journey
   * does not exist or is no longer ACTIVE — or, with `expectedCurrentStep`, no longer at that step (it progressed
   * meanwhile).
   */
  replaceSteps(
    id: string,
    change: {
      steps: JourneyStepInput[];
      currentStep: number;
      plan: JourneyPlan;
      expectedCurrentStep?: number;
    },
  ): Promise<Journey | null> {
    return persist(() =>
      this.prisma.$transaction(async (tx) => {
        const { count } = await tx.journey.updateMany({
          where: { id, status: 'ACTIVE', currentStep: change.expectedCurrentStep },
          data: { ...change.plan, currentStep: change.currentStep },
        });
        if (count === 0) return null;
        await tx.journeyStep.deleteMany({ where: { journeyId: id } });
        await tx.journeyStep.createMany({
          data: stepRows(change.steps).map((step) => ({ ...step, journeyId: id })),
        });
        return toJourney(
          await tx.journey.findUniqueOrThrow({ where: { id }, include: WITH_STEPS }),
        );
      }),
    );
  }

  /**
   * Moves the step in progress of an ACTIVE journey. With `expectedCurrentStep`, only if the journey is still at that
   * step (a concurrent progress or edit makes it `null`). `null` when it is not (or no longer) ACTIVE.
   */
  updateProgress(
    id: string,
    currentStep: number,
    expectedCurrentStep?: number,
  ): Promise<Journey | null> {
    return this.updateActive(id, { currentStep }, expectedCurrentStep);
  }

  /**
   * ACTIVE → COMPLETED, once. With `expectedCurrentStep`, only if the journey is still at that step. `null` when the
   * journey is not (or no longer) ACTIVE.
   */
  complete(id: string, completedAt: Date, expectedCurrentStep?: number): Promise<Journey | null> {
    return this.updateActive(id, { status: 'COMPLETED', completedAt }, expectedCurrentStep);
  }

  private updateActive(
    id: string,
    data: Prisma.JourneyUpdateManyMutationInput,
    expectedCurrentStep?: number,
  ) {
    return persist(async () => {
      const { count } = await this.prisma.journey.updateMany({
        where: { id, status: 'ACTIVE', currentStep: expectedCurrentStep },
        data,
      });
      if (count === 0) return null;
      return toJourney(
        await this.prisma.journey.findUniqueOrThrow({ where: { id }, include: WITH_STEPS }),
      );
    });
  }
}
