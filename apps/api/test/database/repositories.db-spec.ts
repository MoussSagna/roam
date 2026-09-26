import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module.js';
import {
  CheckConstraintError,
  ForeignKeyConstraintError,
  RecordNotFoundError,
  UniqueConstraintError,
} from '../../src/database/persistence-errors.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { EventRepository } from '../../src/modules/catalog/event.repository.js';
import { ExperienceRepository } from '../../src/modules/catalog/experience.repository.js';
import { PlaceRepository } from '../../src/modules/catalog/place.repository.js';
import { CategoryRepository } from '../../src/modules/catalog/category.repository.js';
import { FavoriteRepository } from '../../src/modules/favorites/favorite.repository.js';
import { JourneyFeedbackRepository } from '../../src/modules/journeys/journey-feedback.repository.js';
import { JourneyRepository } from '../../src/modules/journeys/journey.repository.js';
import {
  ActiveJourneyExistsError,
  JourneyFeedbackExistsError,
  type JourneyStepInput,
  type NewJourney,
} from '../../src/modules/journeys/journey.types.js';
import { UserRepository } from '../../src/modules/users/user.repository.js';
import { createTestClient, resetDatabase } from './database.js';

/**
 * The repositories on PostgreSQL (the test database), resolved through the application's own modules — the
 * same instances and the same PrismaService the services will use.
 */
describe('repositories on PostgreSQL', () => {
  let db: PrismaClient; // test fixtures and assertions only
  let close: () => Promise<void>;
  let users: UserRepository;
  let places: PlaceRepository;
  let experiences: ExperienceRepository;
  let events: EventRepository;
  let categories: CategoryRepository;
  let journeys: JourneyRepository;
  let feedback: JourneyFeedbackRepository;
  let favorites: FavoriteRepository;

  beforeAll(async () => {
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    users = moduleRef.get(UserRepository);
    places = moduleRef.get(PlaceRepository);
    experiences = moduleRef.get(ExperienceRepository);
    events = moduleRef.get(EventRepository);
    categories = moduleRef.get(CategoryRepository);
    journeys = moduleRef.get(JourneyRepository);
    feedback = moduleRef.get(JourneyFeedbackRepository);
    favorites = moduleRef.get(FavoriteRepository);
  });

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await resetDatabase(db);
    await db.$disconnect();
    await close();
  });

  let n = 0;
  const newUser = () => users.create({ email: `user${++n}@roam.test`, displayName: `User ${n}` });
  const newPlace = () => places.create({ name: `Place ${++n}`, latitude: 48.85, longitude: 2.35 });
  const newExperience = (placeIds: string[] = []) =>
    experiences.create({ title: `Experience ${++n}`, placeIds });

  const step = (experienceId: string): JourneyStepInput => ({
    experienceId,
    estimatedArrival: '14:10',
    estimatedDurationMin: 45,
    travelDurationMin: 10,
    travelDistanceM: 700,
    travelMode: 'WALK',
  });
  const plan = {
    endTime: '16:00',
    estimatedDurationMin: 120,
    estimatedBudgetEur: 15,
    totalDistanceM: 1800,
  };
  const journeyFor = (userId: string, experienceIds: string[]): NewJourney => ({
    userId,
    title: 'Balade',
    mood: 'CALM',
    duration: 'TWO_HOURS',
    budget: 'LOW',
    startLocation: { kind: 'CURRENT', label: 'Ma position', latitude: 48.85, longitude: 2.35 },
    startTime: '14:00',
    startedAt: new Date(),
    ...plan,
    steps: experienceIds.map(step),
  });

  describe('UserRepository', () => {
    it('create, find by id and email, update the profile', async () => {
      const user = await users.create({ email: 'lea@roam.test', displayName: 'Léa' });

      expect(await users.findById(user.id)).toEqual(user);
      expect(await users.findByEmail('lea@roam.test')).toEqual(user);
      expect(await users.findByEmail('nobody@roam.test')).toBeNull();

      const updated = await users.updateProfile(user.id, { city: 'Paris', bio: null });
      expect(updated).toMatchObject({ city: 'Paris', bio: null, displayName: 'Léa' });
    });

    it('a taken email → UniqueConstraintError; an unknown user → RecordNotFoundError', async () => {
      await users.create({ email: 'lea@roam.test', displayName: 'Léa' });

      await expect(
        users.create({ email: 'lea@roam.test', displayName: 'Autre' }),
      ).rejects.toBeInstanceOf(UniqueConstraintError);
      await expect(
        users.updateProfile('01a0db2f-0000-7000-8000-000000000000', { city: 'Lyon' }),
      ).rejects.toBeInstanceOf(RecordNotFoundError);
    });

    it('preferences: created on first save, then only the given fields change', async () => {
      const user = await newUser();
      expect(await users.findPreference(user.id)).toBeNull();

      await users.savePreference(user.id, { interests: ['culture'], usualBudget: 'FROM_10_TO_25' });
      const saved = await users.savePreference(user.id, { maxDistanceKm: 5 });

      expect(saved).toMatchObject({
        interests: ['culture'],
        activities: [],
        usualBudget: 'FROM_10_TO_25',
        maxDistanceKm: 5,
        usualCompany: null,
      });
      await expect(
        users.savePreference('01a0db2f-0000-7000-8000-000000000000', { maxDistanceKm: 1 }),
      ).rejects.toBeInstanceOf(ForeignKeyConstraintError);
    });
  });

  describe('catalog repositories', () => {
    it('place with categories and provenance; found again by its provider record', async () => {
      await db.category.createMany({ data: [{ slug: 'cafe' }, { slug: 'culture' }] });
      const source = {
        provider: { key: 'google_places', name: 'Google Places' },
        externalId: 'ChIJ-cafe',
        fetchedAt: new Date(),
      };

      const place = await places.create({
        name: 'Café des Arts',
        latitude: 48.85,
        longitude: 2.35,
        openingHours: { mon: ['08:00-18:00'] },
        categorySlugs: ['cafe'],
        source,
      });

      expect(place).toMatchObject({
        categorySlugs: ['cafe'],
        openingHours: { mon: ['08:00-18:00'] },
        priceLevel: 'UNKNOWN',
        enrichment: null,
      });
      expect(await places.findBySource('google_places', 'ChIJ-cafe')).toEqual(place);
      expect(await places.findBySource('ticketmaster', 'ChIJ-cafe')).toBeNull();
      expect(await categories.list()).toEqual([
        expect.objectContaining({ slug: 'cafe' }),
        expect.objectContaining({ slug: 'culture' }),
      ]);

      // The same provider record again: refused, and nothing half-created.
      await expect(
        places.create({ name: 'Doublon', latitude: 0, longitude: 0, source }),
      ).rejects.toBeInstanceOf(UniqueConstraintError);
      expect(await db.place.count()).toBe(1);
      expect(await db.provider.count()).toBe(1);
    });

    it('an unknown category slug fails the whole write', async () => {
      await expect(
        places.create({ name: 'X', latitude: 0, longitude: 0, categorySlugs: ['nope'] }),
      ).rejects.toBeInstanceOf(RecordNotFoundError);
      expect(await db.place.count()).toBe(0);
    });

    it('place update: facts, JSON cleared with null, deactivation', async () => {
      const place = await places.create({
        name: 'Parc',
        latitude: 48.85,
        longitude: 2.35,
        attributes: { outdoor: true },
      });
      const updated = await places.update(place.id, {
        attributes: null,
        isActive: false,
        rating: 4.5,
      });
      expect(updated).toMatchObject({
        attributes: null,
        isActive: false,
        rating: 4.5,
        name: 'Parc',
      });
    });

    it('experience: ordered places, detail, lookup by ids in order, filters and pagination', async () => {
      await db.category.createMany({ data: [{ slug: 'culture' }, { slug: 'food' }] });
      const [a, b] = [await newPlace(), await newPlace()];
      const first = await experiences.create({
        title: 'Musée puis café',
        city: 'Paris',
        priceMin: 12.5,
        categorySlugs: ['culture'],
        placeIds: [b.id, a.id],
      });
      const second = await experiences.create({
        title: 'Marché',
        city: 'Paris',
        categorySlugs: ['food'],
      });
      const third = await experiences.create({ title: 'Lyon', city: 'Lyon' });
      await experiences.update(third.id, { isActive: false });

      const detail = await experiences.findById(first.id);
      expect(detail?.placeIds).toEqual([b.id, a.id]);
      expect(detail?.places.map((place) => place.id)).toEqual([b.id, a.id]);
      expect(detail?.priceMin).toBe(12.5);

      // In the order asked, unknown ids skipped, inactive ones kept (journeys point at them).
      const byIds = await experiences.findManyByIds([
        third.id,
        first.id,
        '01a0db2f-0000-7000-8000-000000000000',
      ]);
      expect(byIds.map((x) => x.id)).toEqual([third.id, first.id]);

      const culture = await experiences.listActive({ categorySlug: 'culture' });
      expect(culture.items.map((x) => x.id)).toEqual([first.id]);

      const page1 = await experiences.listActive({ city: 'Paris' }, { limit: 1 });
      const page2 = await experiences.listActive(
        { city: 'Paris' },
        { limit: 1, cursor: page1.nextCursor! },
      );
      expect([page1.items[0].id, page2.items[0].id]).toEqual([first.id, second.id]);
      expect(page2.nextCursor).toBeNull();
    });

    it('experience with an unknown place: ForeignKeyConstraintError, nothing created', async () => {
      await expect(newExperience(['01a0db2f-0000-7000-8000-000000000000'])).rejects.toBeInstanceOf(
        ForeignKeyConstraintError,
      );
      expect(await db.experience.count()).toBe(0);
    });

    it('event: venue, experience, category, provenance; upcoming range; unlinking the venue', async () => {
      await db.category.create({ data: { slug: 'music' } });
      const venue = await newPlace();
      const experience = await newExperience([venue.id]);
      const concert = await events.create({
        title: 'Concert',
        startDate: new Date('2026-10-10T19:30:00Z'),
        placeId: venue.id,
        experienceId: experience.id,
        categorySlug: 'music',
        priceMin: 20,
        currency: 'EUR',
        source: {
          provider: { key: 'ticketmaster', name: 'Ticketmaster' },
          externalId: 'TM-1',
          fetchedAt: new Date(),
        },
      });
      await events.create({ title: 'Plus tard', startDate: new Date('2026-12-01T19:00:00Z') });

      expect(concert).toMatchObject({
        placeId: venue.id,
        categorySlug: 'music',
        endDate: null,
        priceMin: 20,
      });
      expect(await events.findBySource('ticketmaster', 'TM-1')).toEqual(concert);

      const october = await events.listUpcoming({
        from: new Date('2026-10-01T00:00:00Z'),
        to: new Date('2026-11-01T00:00:00Z'),
      });
      expect(october.items.map((event) => event.id)).toEqual([concert.id]);

      const unlinked = await events.update(concert.id, { placeId: null });
      expect(unlinked).toMatchObject({ placeId: null, experienceId: experience.id });
    });
  });

  describe('JourneyRepository', () => {
    it('create and read back: the active journey of the user, steps in order', async () => {
      const user = await newUser();
      const [x1, x2] = [await newExperience(), await newExperience()];

      const journey = await journeys.create(journeyFor(user.id, [x2.id, x1.id]));

      expect(journey).toMatchObject({ status: 'ACTIVE', currentStep: 0, completedAt: null });
      expect(journey.steps.map((s) => [s.order, s.experienceId])).toEqual([
        [0, x2.id],
        [1, x1.id],
      ]);
      expect(await journeys.findActiveByUserId(user.id)).toEqual(journey);
      expect(await journeys.findById(journey.id)).toEqual(journey);
    });

    it('a second ACTIVE journey → ActiveJourneyExistsError, even when both are created at once', async () => {
      const user = await newUser();
      const x = await newExperience();

      const results = await Promise.allSettled([
        journeys.create(journeyFor(user.id, [x.id])),
        journeys.create(journeyFor(user.id, [x.id])),
        journeys.create(journeyFor(user.id, [x.id])),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      for (const r of results.filter((r) => r.status === 'rejected')) {
        expect(r.reason).toBeInstanceOf(ActiveJourneyExistsError);
      }
      expect(await db.journey.count()).toBe(1);
    });

    it('replaceSteps: new list and plan in one transaction', async () => {
      const user = await newUser();
      const [x1, x2, x3] = [await newExperience(), await newExperience(), await newExperience()];
      const journey = await journeys.create(journeyFor(user.id, [x1.id, x2.id]));

      const edited = await journeys.replaceSteps(journey.id, {
        steps: [step(x3.id), step(x1.id)],
        currentStep: 1,
        plan: { ...plan, totalDistanceM: 2500 },
      });

      expect(edited?.steps.map((s) => s.experienceId)).toEqual([x3.id, x1.id]);
      expect(edited).toMatchObject({ currentStep: 1, totalDistanceM: 2500, status: 'ACTIVE' });
    });

    it('replaceSteps failing half-way rolls everything back (duplicate or unknown experience)', async () => {
      const user = await newUser();
      const [x1, x2] = [await newExperience(), await newExperience()];
      const journey = await journeys.create(journeyFor(user.id, [x1.id, x2.id]));

      await expect(
        journeys.replaceSteps(journey.id, {
          steps: [step(x1.id), step(x1.id)],
          currentStep: 0,
          plan,
        }),
      ).rejects.toBeInstanceOf(UniqueConstraintError);
      await expect(
        journeys.replaceSteps(journey.id, {
          steps: [step('01a0db2f-0000-7000-8000-000000000000')],
          currentStep: 0,
          plan: { ...plan, totalDistanceM: 1 },
        }),
      ).rejects.toBeInstanceOf(ForeignKeyConstraintError);

      expect(await journeys.findById(journey.id)).toEqual(journey);
    });

    it('progress and completion only on an ACTIVE journey; history most recent first, paginated', async () => {
      const user = await newUser();
      const x = await newExperience();

      const first = await journeys.create(journeyFor(user.id, [x.id]));
      expect(await journeys.updateProgress(first.id, 1)).toMatchObject({ currentStep: 1 });
      const done = await journeys.complete(first.id, new Date('2026-09-20T18:00:00Z'));
      expect(done).toMatchObject({ status: 'COMPLETED' });

      // Completed: no more writes (the service decides what to answer).
      expect(await journeys.complete(first.id, new Date())).toBeNull();
      expect(await journeys.updateProgress(first.id, 0)).toBeNull();
      expect(
        await journeys.replaceSteps(first.id, { steps: [step(x.id)], currentStep: 0, plan }),
      ).toBeNull();
      expect(await journeys.findActiveByUserId(user.id)).toBeNull();

      const second = await journeys.create(journeyFor(user.id, [x.id]));
      await journeys.complete(second.id, new Date('2026-09-25T18:00:00Z'));

      const page1 = await journeys.listCompletedByUserId(user.id, { limit: 1 });
      const page2 = await journeys.listCompletedByUserId(user.id, {
        limit: 1,
        cursor: page1.nextCursor!,
      });
      expect([page1.items[0].id, page2.items[0].id]).toEqual([second.id, first.id]);
      expect(page2.nextCursor).toBeNull();
    });

    it('an experience in a journey cannot be deleted', async () => {
      const user = await newUser();
      const x = await newExperience();
      await journeys.create(journeyFor(user.id, [x.id]));

      await expect(db.experience.delete({ where: { id: x.id } })).rejects.toThrow();
    });
  });

  describe('JourneyFeedbackRepository', () => {
    it('one per journey; the rating range is guaranteed by PostgreSQL', async () => {
      const user = await newUser();
      const x = await newExperience();
      const journey = await journeys.create(journeyFor(user.id, [x.id]));
      await journeys.complete(journey.id, new Date());

      expect(await feedback.findByJourneyId(journey.id)).toBeNull();
      await expect(
        feedback.create({ journeyId: journey.id, userId: user.id, rating: 9 }),
      ).rejects.toBeInstanceOf(CheckConstraintError);

      const saved = await feedback.create({
        journeyId: journey.id,
        userId: user.id,
        rating: 5,
        comment: 'Top',
      });
      expect(await feedback.findByJourneyId(journey.id)).toEqual(saved);
      await expect(
        feedback.create({ journeyId: journey.id, userId: user.id, rating: 3 }),
      ).rejects.toBeInstanceOf(JourneyFeedbackExistsError);
    });
  });

  describe('FavoriteRepository', () => {
    it('add is idempotent, even concurrently; remove; isFavorite; list most recent first', async () => {
      const user = await newUser();
      const [x1, x2] = [await newExperience(), await newExperience()];

      const [a, b] = await Promise.all([
        favorites.add(user.id, x1.id),
        favorites.add(user.id, x1.id),
      ]);
      expect(a.id).toBe(b.id);
      expect(await db.favorite.count()).toBe(1);

      await favorites.add(user.id, x2.id);
      expect(await favorites.isFavorite(user.id, x2.id)).toBe(true);
      const page = await favorites.listByUserId(user.id);
      expect(page.items.map((f) => f.experienceId)).toEqual([x2.id, x1.id]);

      expect(await favorites.remove(user.id, x2.id)).toBe(true);
      expect(await favorites.remove(user.id, x2.id)).toBe(false);
      expect(await favorites.isFavorite(user.id, x2.id)).toBe(false);
    });

    it('an unknown experience → ForeignKeyConstraintError', async () => {
      const user = await newUser();
      await expect(
        favorites.add(user.id, '01a0db2f-0000-7000-8000-000000000000'),
      ).rejects.toBeInstanceOf(ForeignKeyConstraintError);
    });
  });
});
