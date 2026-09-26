import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  createExperience,
  createPlace,
  createProvider,
  createTestClient,
  createUser,
  journeyData,
  resetDatabase,
  stepData,
} from './database.js';

/**
 * The data model on a real PostgreSQL: relations, defaults, timestamps, unique and CHECK constraints,
 * delete rules. Every test starts from an empty test database.
 */
describe('ROAM data model on PostgreSQL', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestClient();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  });

  describe('records, defaults and timestamps', () => {
    it('creates a user with preferences and reads them back through the relation', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'lea@roam.test',
          displayName: 'Léa',
          preference: {
            create: {
              interests: ['culture', 'food'],
              usualBudget: 'FROM_10_TO_25',
              maxDistanceKm: 5,
              usualCompany: 'FRIENDS',
            },
          },
        },
      });

      // UUID v7: time-ordered, version nibble 7.
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      const read = await prisma.user.findUniqueOrThrow({
        where: { email: 'lea@roam.test' },
        include: { preference: true },
      });
      expect(read.preference).toMatchObject({
        userId: user.id,
        interests: ['culture', 'food'],
        activities: [],
        usualBudget: 'FROM_10_TO_25',
        usualCompany: 'FRIENDS',
      });
    });

    it('sets createdAt/updatedAt, and moves updatedAt on update only', async () => {
      const user = await createUser(prisma);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());

      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await prisma.user.update({ where: { id: user.id }, data: { city: 'Paris' } });
      expect(updated.createdAt).toEqual(user.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('never invents a price: UNKNOWN level and null amounts by default (DATA_RULES.md)', async () => {
      const experience = await createExperience(prisma);
      expect(experience).toMatchObject({
        priceLevel: 'UNKNOWN',
        priceMin: null,
        priceMax: null,
        currency: null,
        isActive: true,
      });
    });

    it('stores decimal prices exactly', async () => {
      const place = await createPlace(prisma);
      const event = await prisma.event.create({
        data: {
          title: 'Concert',
          startDate: new Date('2026-10-10T19:30:00Z'),
          placeId: place.id,
          priceMin: '12.50',
          priceMax: '39.90',
          currency: 'EUR',
          priceLevel: 'MEDIUM',
        },
      });
      expect(event.priceMin?.toString()).toBe('12.5');
      expect(event.priceMax?.toString()).toBe('39.9');
      expect(event.endDate).toBeNull();
    });

    it('rejects a value outside an enum', async () => {
      const user = await createUser(prisma);
      await expect(
        prisma.journey.create({ data: { ...journeyData(user.id), status: 'DRAFT' as 'ACTIVE' } }),
      ).rejects.toThrow();
      expect(await prisma.journey.count()).toBe(0);
    });
  });

  describe('Experience / Place / Event stay separate records', () => {
    it('an experience is made of ordered places; an event takes place at a place', async () => {
      const [cafe, park] = [await createPlace(prisma), await createPlace(prisma)];
      const category = await prisma.category.create({ data: { slug: 'culture' } });
      const experience = await prisma.experience.create({
        data: {
          title: 'Café puis parc',
          places: {
            create: [
              { placeId: park.id, position: 1 },
              { placeId: cafe.id, position: 0 },
            ],
          },
          categories: { create: [{ categoryId: category.id }] },
        },
      });
      await prisma.event.create({
        data: {
          title: 'Lecture au parc',
          startDate: new Date('2026-10-11T15:00:00Z'),
          placeId: park.id,
          experienceId: experience.id,
          categoryId: category.id,
        },
      });

      const read = await prisma.experience.findUniqueOrThrow({
        where: { id: experience.id },
        include: {
          places: { orderBy: { position: 'asc' }, include: { place: true } },
          events: { include: { place: true } },
          categories: { include: { category: true } },
        },
      });
      expect(read.places.map((step) => step.place.id)).toEqual([cafe.id, park.id]);
      expect(read.events[0].place?.id).toBe(park.id);
      expect(read.categories[0].category.slug).toBe('culture');
    });

    it('two places cannot share a position in an experience, and a place appears once', async () => {
      const [a, b] = [await createPlace(prisma), await createPlace(prisma)];
      const experience = await createExperience(prisma);
      await prisma.experiencePlace.create({
        data: { experienceId: experience.id, placeId: a.id, position: 0 },
      });

      await expect(
        prisma.experiencePlace.create({
          data: { experienceId: experience.id, placeId: b.id, position: 0 },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        prisma.experiencePlace.create({
          data: { experienceId: experience.id, placeId: a.id, position: 1 },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('a place used by an experience cannot be deleted (deactivate it instead)', async () => {
      const place = await createPlace(prisma);
      const experience = await createExperience(prisma);
      await prisma.experiencePlace.create({
        data: { experienceId: experience.id, placeId: place.id, position: 0 },
      });

      await expect(prisma.place.delete({ where: { id: place.id } })).rejects.toThrow();
      await prisma.place.update({ where: { id: place.id }, data: { isActive: false } });
      expect(await prisma.experiencePlace.count()).toBe(1);
    });

    it("deleting an event's venue keeps the event, without a venue", async () => {
      const place = await createPlace(prisma);
      const event = await prisma.event.create({
        data: { title: 'Expo', startDate: new Date('2026-11-01T10:00:00Z'), placeId: place.id },
      });

      await prisma.place.delete({ where: { id: place.id } });
      expect(await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({
        placeId: null,
      });
    });
  });

  describe('provenance and ROAM enrichment', () => {
    it('a provider record is imported once: (provider, entity type, external id) is unique', async () => {
      const provider = await createProvider(prisma);
      const [first, second] = [await createPlace(prisma), await createPlace(prisma)];
      const source = (placeId: string) => ({
        providerId: provider.id,
        entityType: 'PLACE' as const,
        externalId: 'ChIJ-same-id',
        fetchedAt: new Date(),
        placeId,
      });

      await prisma.externalSource.create({ data: source(first.id) });
      await expect(prisma.externalSource.create({ data: source(second.id) })).rejects.toMatchObject(
        { code: 'P2002' },
      );

      // Idempotent sync: the dedup key finds the existing row.
      const found = await prisma.externalSource.findUniqueOrThrow({
        where: {
          providerId_entityType_externalId: {
            providerId: provider.id,
            entityType: 'PLACE',
            externalId: 'ChIJ-same-id',
          },
        },
      });
      expect(found.placeId).toBe(first.id);
    });

    it('a source points at exactly the record its entity type names (CHECK)', async () => {
      const provider = await createProvider(prisma);
      const place = await createPlace(prisma);
      const experience = await createExperience(prisma);
      const base = { providerId: provider.id, externalId: 'x', fetchedAt: new Date() };

      await expect(
        prisma.externalSource.create({ data: { ...base, entityType: 'EVENT', placeId: place.id } }),
      ).rejects.toThrow(/external_sources_single_target_check/);
      await expect(
        prisma.externalSource.create({
          data: { ...base, entityType: 'PLACE', placeId: place.id, experienceId: experience.id },
        }),
      ).rejects.toThrow(/external_sources_single_target_check/);
      await expect(
        prisma.externalSource.create({ data: { ...base, entityType: 'PLACE' } }),
      ).rejects.toThrow(/external_sources_single_target_check/);
      expect(await prisma.externalSource.count()).toBe(0);
    });

    it('a provider with imported records cannot be deleted', async () => {
      const provider = await createProvider(prisma);
      const place = await createPlace(prisma);
      await prisma.externalSource.create({
        data: {
          providerId: provider.id,
          entityType: 'PLACE',
          externalId: 'p',
          fetchedAt: new Date(),
          placeId: place.id,
        },
      });

      await expect(prisma.provider.delete({ where: { id: provider.id } })).rejects.toThrow();
    });

    it('enrichment: one per record, for exactly one place or one experience (CHECK)', async () => {
      const place = await createPlace(prisma);
      const experience = await createExperience(prisma);

      const enrichment = await prisma.roamEnrichment.create({
        data: {
          placeId: place.id,
          atmosphere: ['COZY'],
          suitableFor: ['COUPLE', 'FRIENDS'],
          bestMoments: ['EVENING'],
          confidence: { energyLevel: { confidence: 0.78, rule: 'liveMusic+bar' } },
        },
      });
      expect(enrichment).toMatchObject({
        energyLevel: 'UNKNOWN',
        source: 'ROAM_RULES',
        durationIsDerived: false,
      });

      await expect(
        prisma.roamEnrichment.create({ data: { placeId: place.id } }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        prisma.roamEnrichment.create({ data: { experienceId: experience.id, placeId: null } }),
      ).resolves.toBeDefined();
      await expect(prisma.roamEnrichment.create({ data: {} })).rejects.toThrow(
        /roam_enrichments_single_target_check/,
      );
    });

    it("deleting a place removes its provenance and enrichment, not the provider's other records", async () => {
      const provider = await createProvider(prisma);
      const [gone, kept] = [await createPlace(prisma), await createPlace(prisma)];
      for (const [place, externalId] of [
        [gone, 'a'],
        [kept, 'b'],
      ] as const) {
        await prisma.externalSource.create({
          data: {
            providerId: provider.id,
            entityType: 'PLACE',
            externalId,
            fetchedAt: new Date(),
            placeId: place.id,
          },
        });
      }
      await prisma.roamEnrichment.create({ data: { placeId: gone.id } });

      await prisma.place.delete({ where: { id: gone.id } });
      expect(await prisma.externalSource.findMany({ select: { externalId: true } })).toEqual([
        { externalId: 'b' },
      ]);
      expect(await prisma.roamEnrichment.count()).toBe(0);
    });
  });

  describe('journeys', () => {
    it('creates a journey with ordered steps and reads them back', async () => {
      const user = await createUser(prisma);
      const [a, b] = [await createExperience(prisma), await createExperience(prisma)];

      const journey = await prisma.journey.create({
        data: {
          ...journeyData(user.id),
          startedAt: new Date(),
          steps: { create: [stepData(b.id, 1), stepData(a.id, 0)] },
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });

      expect(journey).toMatchObject({ status: 'ACTIVE', currentStep: 0, completedAt: null });
      expect(journey.steps.map((step) => step.experienceId)).toEqual([a.id, b.id]);
    });

    it('at most one ACTIVE journey per user; completed ones are unlimited (partial unique index)', async () => {
      const [user, other] = [await createUser(prisma), await createUser(prisma)];

      await prisma.journey.create({ data: journeyData(user.id, 'COMPLETED') });
      await prisma.journey.create({ data: journeyData(user.id, 'COMPLETED') });
      const active = await prisma.journey.create({ data: journeyData(user.id) });
      await expect(prisma.journey.create({ data: journeyData(user.id) })).rejects.toMatchObject({
        code: 'P2002',
      });
      // Another user has their own active journey.
      await prisma.journey.create({ data: journeyData(other.id) });

      // The index's lookup: the user's active journey (always with the status — DATABASE_SCHEMA.md).
      const current = await prisma.journey.findUnique({
        where: { userId: user.id, status: 'ACTIVE' },
      });
      expect(current?.id).toBe(active.id);

      // Once completed, a new journey can start.
      await prisma.journey.update({
        where: { id: active.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await expect(prisma.journey.create({ data: journeyData(user.id) })).resolves.toBeDefined();
    });

    it('a step position and an experience appear at most once in a journey', async () => {
      const user = await createUser(prisma);
      const [a, b] = [await createExperience(prisma), await createExperience(prisma)];
      const journey = await prisma.journey.create({
        data: { ...journeyData(user.id), steps: { create: [stepData(a.id, 0)] } },
      });

      await expect(
        prisma.journeyStep.create({ data: { ...stepData(b.id, 0), journeyId: journey.id } }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        prisma.journeyStep.create({ data: { ...stepData(a.id, 1), journeyId: journey.id } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('an experience in a journey cannot be deleted (history keeps pointing at it)', async () => {
      const user = await createUser(prisma);
      const experience = await createExperience(prisma);
      await prisma.journey.create({
        data: { ...journeyData(user.id), steps: { create: [stepData(experience.id, 0)] } },
      });

      await expect(prisma.experience.delete({ where: { id: experience.id } })).rejects.toThrow();
    });
  });

  describe('favorites and feedback', () => {
    it('a favorite is saved once per user and experience', async () => {
      const user = await createUser(prisma);
      const experience = await createExperience(prisma);
      await prisma.favorite.create({ data: { userId: user.id, experienceId: experience.id } });

      await expect(
        prisma.favorite.create({ data: { userId: user.id, experienceId: experience.id } }),
      ).rejects.toMatchObject({ code: 'P2002' });
      expect(
        await prisma.favorite.findUnique({
          where: { userId_experienceId: { userId: user.id, experienceId: experience.id } },
        }),
      ).not.toBeNull();
    });

    it('journey feedback: 1–5 stars (CHECK), one per journey, comment of at most 300 characters', async () => {
      const user = await createUser(prisma);
      const journey = await prisma.journey.create({
        data: { ...journeyData(user.id, 'COMPLETED'), completedAt: new Date() },
      });
      const feedback = (rating: number, comment?: string) => ({
        journeyId: journey.id,
        userId: user.id,
        rating,
        comment,
      });

      for (const rating of [0, 6]) {
        await expect(prisma.journeyFeedback.create({ data: feedback(rating) })).rejects.toThrow(
          /journey_feedbacks_rating_check/,
        );
      }
      await expect(
        prisma.journeyFeedback.create({ data: feedback(4, 'x'.repeat(301)) }),
      ).rejects.toThrow();

      const saved = await prisma.journeyFeedback.create({ data: feedback(5, 'Super balade') });
      expect(saved).toMatchObject({ rating: 5, comment: 'Super balade' });
      await expect(prisma.journeyFeedback.create({ data: feedback(3) })).rejects.toMatchObject({
        code: 'P2002',
      });
    });
  });

  it('deleting a user deletes what they own (preferences, journeys and steps, favorites, feedback) — not the catalog', async () => {
    const user = await createUser(prisma);
    const experience = await createExperience(prisma);
    await prisma.userPreference.create({ data: { userId: user.id, interests: ['culture'] } });
    await prisma.favorite.create({ data: { userId: user.id, experienceId: experience.id } });
    const journey = await prisma.journey.create({
      data: {
        ...journeyData(user.id, 'COMPLETED'),
        steps: { create: [stepData(experience.id, 0)] },
      },
    });
    await prisma.journeyFeedback.create({
      data: { journeyId: journey.id, userId: user.id, rating: 4 },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(
      await Promise.all([
        prisma.userPreference.count(),
        prisma.favorite.count(),
        prisma.journey.count(),
        prisma.journeyStep.count(),
        prisma.journeyFeedback.count(),
      ]),
    ).toEqual([0, 0, 0, 0, 0]);
    expect(await prisma.experience.count()).toBe(1);
  });
});
