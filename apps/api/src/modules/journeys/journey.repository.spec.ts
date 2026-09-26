import {
  DatabaseUnavailableError,
  UniqueConstraintError,
} from '../../database/persistence-errors.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { JourneyRepository } from './journey.repository.js';
import { ActiveJourneyExistsError, type NewJourney } from './journey.types.js';

/** Prisma is mocked: these tests check the repository's own behavior, not PostgreSQL (see test:db). */
function setup() {
  const prisma = {
    journey: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  };
  return { prisma, repository: new JourneyRepository(prisma as unknown as PrismaService) };
}

const uniqueViolation = (index: string) =>
  Object.assign(new Error('unique'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2002',
    meta: { driverAdapterError: { cause: { constraint: { index } } } },
  });

const row = {
  id: 'j1',
  userId: 'u1',
  status: 'ACTIVE',
  title: 'Balade',
  mood: 'CALM',
  duration: 'TWO_HOURS',
  budget: 'LOW',
  startKind: 'ADDRESS',
  startLabel: '10 rue de Rivoli',
  startDetail: null,
  startLatitude: 48.85,
  startLongitude: 2.35,
  startTime: '14:00',
  endTime: '16:00',
  estimatedDurationMin: 120,
  estimatedBudgetEur: 15,
  totalDistanceM: 1800,
  currentStep: 0,
  startedAt: new Date('2026-09-26T12:00:00Z'),
  completedAt: null,
  createdAt: new Date('2026-09-26T12:00:00Z'),
  updatedAt: new Date('2026-09-26T12:00:00Z'),
  steps: [
    {
      id: 's1',
      journeyId: 'j1',
      experienceId: 'x1',
      order: 0,
      estimatedArrival: '14:10',
      estimatedDurationMin: 45,
      travelDurationMin: 10,
      travelDistanceM: 700,
      travelMode: 'WALK',
    },
  ],
};

const newJourney: NewJourney = {
  userId: 'u1',
  title: 'Balade',
  mood: 'CALM',
  duration: 'TWO_HOURS',
  budget: 'LOW',
  startLocation: { kind: 'ADDRESS', label: '10 rue de Rivoli', latitude: 48.85, longitude: 2.35 },
  startTime: '14:00',
  startedAt: new Date('2026-09-26T12:00:00Z'),
  endTime: '16:00',
  estimatedDurationMin: 120,
  estimatedBudgetEur: 15,
  totalDistanceM: 1800,
  steps: [
    {
      experienceId: 'x1',
      estimatedArrival: '14:10',
      estimatedDurationMin: 45,
      travelDurationMin: 10,
      travelDistanceM: 700,
      travelMode: 'WALK',
    },
  ],
};

describe('JourneyRepository (Prisma mocked)', () => {
  it('maps the stored row to the domain journey (start location grouped, no Prisma ids on steps)', async () => {
    const { prisma, repository } = setup();
    prisma.journey.create.mockResolvedValue(row);

    const journey = await repository.create(newJourney);

    expect(journey.startLocation).toEqual({
      kind: 'ADDRESS',
      label: '10 rue de Rivoli',
      detail: null,
      latitude: 48.85,
      longitude: 2.35,
    });
    expect(journey.steps[0]).not.toHaveProperty('journeyId');
    expect(journey.steps[0]).not.toHaveProperty('id');
  });

  it('creates ACTIVE, with each step at its index', async () => {
    const { prisma, repository } = setup();
    prisma.journey.create.mockResolvedValue(row);

    await repository.create(newJourney);

    const { data } = prisma.journey.create.mock.calls[0][0] as {
      data: { status: string; startDetail: null; steps: { create: { order: number }[] } };
    };
    expect(data.status).toBe('ACTIVE');
    expect(data.startDetail).toBeNull();
    expect(data.steps.create.map((step) => step.order)).toEqual([0]);
  });

  it('the partial unique index refusing a second ACTIVE journey → ActiveJourneyExistsError', async () => {
    const { prisma, repository } = setup();
    prisma.journey.create.mockRejectedValue(uniqueViolation('journeys_one_active_per_user'));

    await expect(repository.create(newJourney)).rejects.toBeInstanceOf(ActiveJourneyExistsError);
  });

  it('another unique violation stays a UniqueConstraintError', async () => {
    const { prisma, repository } = setup();
    prisma.journey.create.mockRejectedValue(
      uniqueViolation('journey_steps_journeyId_experienceId_key'),
    );

    await expect(repository.create(newJourney)).rejects.toBeInstanceOf(UniqueConstraintError);
  });

  it('complete: only an ACTIVE journey (conditional update); null and no read otherwise', async () => {
    const { prisma, repository } = setup();
    prisma.journey.updateMany.mockResolvedValue({ count: 0 });
    const completedAt = new Date('2026-09-26T16:00:00Z');

    await expect(repository.complete('j1', completedAt)).resolves.toBeNull();
    expect(prisma.journey.updateMany).toHaveBeenCalledWith({
      where: { id: 'j1', status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt },
    });
    expect(prisma.journey.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('a database outage surfaces as DatabaseUnavailableError, never as a Prisma error', async () => {
    const { prisma, repository } = setup();
    prisma.journey.updateMany.mockRejectedValue(
      Object.assign(new Error("Can't reach database server"), {
        name: 'PrismaClientKnownRequestError',
        code: 'P1001',
      }),
    );

    await expect(repository.updateProgress('j1', 1)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
