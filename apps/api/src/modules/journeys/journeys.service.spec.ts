import { ApiException } from '../../common/errors/api-error.js';
import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { Experience } from '../catalog/catalog.types.js';
import type { ExperienceRepository } from '../catalog/experience.repository.js';
import type { User } from '../users/user.repository.js';
import type { JourneyRepository } from './journey.repository.js';
import { ActiveJourneyExistsError, type Journey } from './journey.types.js';
import { type JourneyDraft, JourneysService } from './journeys.service.js';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const me = { id: 'user-a' } as User;
const other = { id: 'user-b' } as User;

function experience(id: string, change: Partial<Experience> = {}): Experience {
  return {
    id,
    title: id,
    description: null,
    address: null,
    city: 'Paris',
    latitude: 48.8674,
    longitude: 2.3637,
    coverImage: null,
    images: [],
    startDate: null,
    endDate: null,
    openingHours: null,
    priceLevel: 'FREE',
    priceMin: 0,
    priceMax: 0,
    currency: 'EUR',
    rating: 4.5,
    reviewCount: 10,
    popularity: null,
    isActive: true,
    categorySlugs: [],
    placeIds: [],
    enrichment: {
      atmosphere: [],
      energyLevel: 'UNKNOWN',
      suitableFor: [],
      bestMoments: [],
      tags: [],
      estimatedDurationMin: 60,
      durationIsDerived: true,
      source: 'CURATED',
      confidence: null,
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...change,
  };
}

function journey(change: Partial<Journey> = {}): Journey {
  const ids = ['e1', 'e2', 'e3'];
  return {
    id: 'j1',
    userId: me.id,
    status: 'ACTIVE',
    title: 'Parcours calme',
    mood: 'CALM',
    duration: 'TWO_HOURS',
    budget: 'LOW',
    startLocation: {
      kind: 'PLACE',
      label: 'République',
      detail: null,
      latitude: 48.8674,
      longitude: 2.3637,
    },
    startTime: '14:00',
    endTime: '17:00',
    estimatedDurationMin: 180,
    estimatedBudgetEur: 0,
    totalDistanceM: 0,
    currentStep: 0,
    startedAt: NOW,
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    steps: ids.map((experienceId, order) => ({
      experienceId,
      order,
      estimatedArrival: '14:00',
      estimatedDurationMin: 60,
      travelDurationMin: 0,
      travelDistanceM: 0,
      travelMode: 'WALK' as const,
    })),
    ...change,
  };
}

const draft: JourneyDraft = {
  title: 'Parcours calme',
  mood: 'CALM',
  duration: 'TWO_HOURS',
  budget: 'LOW',
  startLocation: {
    kind: 'PLACE',
    label: 'République',
    detail: null,
    latitude: 48.8674,
    longitude: 2.3637,
  },
  startTime: '14:00',
  experienceIds: ['e1', 'e2', 'e1'],
};

function setup() {
  const journeys = {
    findById: vi.fn(),
    findActiveByUserId: vi.fn(),
    listCompletedByUserId: vi.fn(),
    create: vi.fn(),
    replaceSteps: vi.fn(),
    updateProgress: vi.fn(),
    complete: vi.fn(),
  };
  const catalog = {
    findManyByIds: vi.fn((ids: string[]) => Promise.resolve(ids.map((id) => experience(id)))),
  };
  const service = new JourneysService(
    journeys as unknown as JourneyRepository,
    catalog as unknown as ExperienceRepository,
    { now: () => NOW },
  );
  return { service, journeys, catalog };
}

async function apiError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiException);
  const { code, details } = error as ApiException;
  return { status: (error as ApiException).getStatus(), code, details };
}

describe('JourneysService (repositories mocked)', () => {
  describe('create', () => {
    it('plans the draft (duplicates kept once) and stores an ACTIVE journey started now for the session user', async () => {
      const { service, journeys } = setup();
      journeys.findActiveByUserId.mockResolvedValue(null);
      journeys.create.mockImplementation(() => Promise.resolve(journey()));

      const created = await service.create(me, draft);

      const stored = journeys.create.mock.calls[0][0] as Record<string, unknown>;
      expect(stored).toMatchObject({
        userId: 'user-a',
        title: 'Parcours calme',
        startedAt: NOW,
        startTime: '14:00',
        endTime: '16:00',
        estimatedDurationMin: 120,
        estimatedBudgetEur: 0,
        totalDistanceM: 0,
      });
      expect((stored.steps as { experienceId: string }[]).map((step) => step.experienceId)).toEqual(
        ['e1', 'e2'],
      );
      expect(stored).not.toHaveProperty('status');
      expect(stored).not.toHaveProperty('currentStep');
      expect(created.steps.map((step) => step.experience.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('409 JOURNEY_ALREADY_ACTIVE: already one, or one created concurrently (the index refused it)', async () => {
      const { service, journeys } = setup();
      journeys.findActiveByUserId.mockResolvedValueOnce(journey());
      expect(await apiError(service.create(me, draft))).toMatchObject({
        status: 409,
        code: 'JOURNEY_ALREADY_ACTIVE',
      });
      expect(journeys.create).not.toHaveBeenCalled();

      journeys.findActiveByUserId.mockResolvedValueOnce(null);
      journeys.create.mockRejectedValueOnce(new ActiveJourneyExistsError());
      expect(await apiError(service.create(me, draft))).toMatchObject({
        code: 'JOURNEY_ALREADY_ACTIVE',
      });
    });

    it('422 JOURNEY_EXPERIENCE_UNAVAILABLE: unknown, inactive or without duration — each listed', async () => {
      const { service, journeys, catalog } = setup();
      journeys.findActiveByUserId.mockResolvedValue(null);
      catalog.findManyByIds.mockResolvedValue([
        experience('e1'),
        experience('old', { isActive: false }),
        experience('nodur', { enrichment: null }),
      ]);

      const error = await apiError(
        service.create(me, { ...draft, experienceIds: ['e1', 'missing', 'old', 'nodur'] }),
      );

      expect(error).toMatchObject({ status: 422, code: 'JOURNEY_EXPERIENCE_UNAVAILABLE' });
      expect(error.details).toEqual([
        { experienceId: 'missing', reason: 'notFound' },
        { experienceId: 'old', reason: 'inactive' },
        { experienceId: 'nodur', reason: 'noDuration' },
      ]);
      expect(journeys.create).not.toHaveBeenCalled();
    });

    it('repository errors pass through (the global filter answers 503)', async () => {
      const { service, journeys } = setup();
      journeys.findActiveByUserId.mockRejectedValue(new DatabaseUnavailableError());
      await expect(service.create(me, draft)).rejects.toBeInstanceOf(DatabaseUnavailableError);
    });
  });

  describe('reads', () => {
    it('active: the journey with its experiences, or null', async () => {
      const { service, journeys, catalog } = setup();
      journeys.findActiveByUserId.mockResolvedValueOnce(journey());
      expect((await service.getActive(me))?.steps[2].experience.id).toBe('e3');
      expect(journeys.findActiveByUserId).toHaveBeenCalledWith('user-a');
      expect(catalog.findManyByIds).toHaveBeenCalledTimes(1);

      journeys.findActiveByUserId.mockResolvedValueOnce(null);
      expect(await service.getActive(me)).toBeNull();
    });

    it('history: the user’s page, experiences fetched once for the whole page', async () => {
      const { service, journeys, catalog } = setup();
      journeys.listCompletedByUserId.mockResolvedValue({
        items: [
          journey({ id: 'j1', status: 'COMPLETED' }),
          journey({ id: 'j2', status: 'COMPLETED' }),
        ],
        nextCursor: 'j2',
      });

      const page = await service.listCompleted(me, { limit: 2 });

      expect(journeys.listCompletedByUserId).toHaveBeenCalledWith('user-a', { limit: 2 });
      expect(page.nextCursor).toBe('j2');
      expect(page.items).toHaveLength(2);
      expect(catalog.findManyByIds).toHaveBeenCalledTimes(1);
      expect(catalog.findManyByIds).toHaveBeenCalledWith(['e1', 'e2', 'e3']);
    });

    it('detail: 404 NOT_FOUND for an unknown journey and for another user’s', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValueOnce(journey());
      expect((await service.get(me, 'j1')).id).toBe('j1');

      journeys.findById.mockResolvedValueOnce(null);
      expect(await apiError(service.get(me, 'j1'))).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
      journeys.findById.mockResolvedValueOnce(journey());
      expect(await apiError(service.get(other, 'j1'))).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('updateSteps', () => {
    it('replans from the journey’s start, keeps the current experience current, guards on the current step', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ currentStep: 1 })); // e1 done, e2 current
      journeys.replaceSteps.mockResolvedValue(journey({ currentStep: 0 }));

      await service.updateSteps(me, 'j1', ['e2', 'e4', 'e2']);

      expect(journeys.replaceSteps).toHaveBeenCalledWith('j1', {
        steps: [
          expect.objectContaining({ experienceId: 'e2' }),
          expect.objectContaining({ experienceId: 'e4' }),
        ],
        currentStep: 0,
        expectedCurrentStep: 1,
        plan: {
          endTime: '16:00',
          estimatedDurationMin: 120,
          estimatedBudgetEur: 0,
          totalDistanceM: 0,
        },
      });
    });

    it('an experience already in the journey may stay after being deactivated; a new inactive one may not', async () => {
      const { service, journeys, catalog } = setup();
      journeys.findById.mockResolvedValue(journey());
      journeys.replaceSteps.mockResolvedValue(journey());
      catalog.findManyByIds.mockImplementation((ids: string[]) =>
        Promise.resolve(
          ids.map((id) => experience(id, { isActive: id !== 'e1' && id !== 'new-old' })),
        ),
      );

      await service.updateSteps(me, 'j1', ['e1', 'e2']);
      expect(journeys.replaceSteps).toHaveBeenCalledTimes(1);

      expect(await apiError(service.updateSteps(me, 'j1', ['e1', 'new-old']))).toMatchObject({
        code: 'JOURNEY_EXPERIENCE_UNAVAILABLE',
        details: [{ experienceId: 'new-old', reason: 'inactive' }],
      });
    });

    it('409 JOURNEY_NOT_ACTIVE on a completed journey; 404 for another user’s', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ status: 'COMPLETED' }));
      expect(await apiError(service.updateSteps(me, 'j1', ['e1']))).toMatchObject({
        status: 409,
        code: 'JOURNEY_NOT_ACTIVE',
      });
      expect(await apiError(service.updateSteps(other, 'j1', ['e1']))).toMatchObject({
        status: 404,
      });
      expect(journeys.replaceSteps).not.toHaveBeenCalled();
    });

    it('the conditional write found nothing: completed (409 NOT_ACTIVE) or progressed (409 INVALID_STEP) meanwhile', async () => {
      const { service, journeys } = setup();
      journeys.replaceSteps.mockResolvedValue(null);
      journeys.findById
        .mockResolvedValueOnce(journey())
        .mockResolvedValueOnce(journey({ status: 'COMPLETED' }))
        .mockResolvedValueOnce(journey())
        .mockResolvedValueOnce(journey({ currentStep: 1 }));

      expect(await apiError(service.updateSteps(me, 'j1', ['e1']))).toMatchObject({
        code: 'JOURNEY_NOT_ACTIVE',
      });
      expect(await apiError(service.updateSteps(me, 'j1', ['e1']))).toMatchObject({
        code: 'JOURNEY_INVALID_STEP',
        details: { currentStep: 1, stepCount: 3 },
      });
    });
  });

  describe('progress', () => {
    it('one step forward, guarded on the step it came from', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ currentStep: 0 }));
      journeys.updateProgress.mockResolvedValue(journey({ currentStep: 1 }));

      expect((await service.progress(me, 'j1', 1)).currentStep).toBe(1);
      expect(journeys.updateProgress).toHaveBeenCalledWith('j1', 1, 0);
    });

    it('the current step again is a no-op (a retried request)', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ currentStep: 1 }));
      expect((await service.progress(me, 'j1', 1)).currentStep).toBe(1);
      expect(journeys.updateProgress).not.toHaveBeenCalled();
    });

    it('409 JOURNEY_INVALID_STEP: skipping, going back, or past the last step (that is `complete`)', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ currentStep: 1 }));
      for (const step of [3, 0, 99]) {
        expect(await apiError(service.progress(me, 'j1', step))).toMatchObject({
          status: 409,
          code: 'JOURNEY_INVALID_STEP',
          details: { currentStep: 1, stepCount: 3 },
        });
      }
      journeys.findById.mockResolvedValue(journey({ currentStep: 2 }));
      expect(await apiError(service.progress(me, 'j1', 3))).toMatchObject({
        code: 'JOURNEY_INVALID_STEP',
      });
      expect(journeys.updateProgress).not.toHaveBeenCalled();
    });

    it('409 JOURNEY_NOT_ACTIVE on a completed journey', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ status: 'COMPLETED', currentStep: 2 }));
      expect(await apiError(service.progress(me, 'j1', 2))).toMatchObject({
        code: 'JOURNEY_NOT_ACTIVE',
      });
    });
  });

  describe('complete', () => {
    it('from the last step: ACTIVE → COMPLETED at the server’s time, guarded on that step', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValue(journey({ currentStep: 2 }));
      journeys.complete.mockResolvedValue(
        journey({ status: 'COMPLETED', currentStep: 2, completedAt: NOW }),
      );

      expect((await service.complete(me, 'j1')).status).toBe('COMPLETED');
      expect(journeys.complete).toHaveBeenCalledWith('j1', NOW, 2);
    });

    it('409 JOURNEY_INVALID_STEP before the last step; 409 JOURNEY_NOT_ACTIVE once completed', async () => {
      const { service, journeys } = setup();
      journeys.findById.mockResolvedValueOnce(journey({ currentStep: 1 }));
      expect(await apiError(service.complete(me, 'j1'))).toMatchObject({
        code: 'JOURNEY_INVALID_STEP',
        details: { currentStep: 1, stepCount: 3 },
      });
      journeys.findById.mockResolvedValueOnce(journey({ status: 'COMPLETED', currentStep: 2 }));
      expect(await apiError(service.complete(me, 'j1'))).toMatchObject({
        code: 'JOURNEY_NOT_ACTIVE',
      });
      expect(journeys.complete).not.toHaveBeenCalled();
    });

    it('completed concurrently: the conditional write finds nothing → 409 JOURNEY_NOT_ACTIVE', async () => {
      const { service, journeys } = setup();
      journeys.findById
        .mockResolvedValueOnce(journey({ currentStep: 2 }))
        .mockResolvedValueOnce(journey({ status: 'COMPLETED', currentStep: 2 }));
      journeys.complete.mockResolvedValue(null);
      expect(await apiError(service.complete(me, 'j1'))).toMatchObject({
        code: 'JOURNEY_NOT_ACTIVE',
      });
    });
  });
});
