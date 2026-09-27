import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { RoamEnrichmentService } from '../../src/modules/enrichment/roam-enrichment.service.js';
import { EventIngestionService } from '../../src/modules/providers/event-ingestion.service.js';
import { TicketmasterAdapter } from '../../src/modules/providers/ticketmaster/ticketmaster.adapter.js';
import { createTestClient } from './database.js';

/** Fictional key and ids: this suite never calls Ticketmaster (fetch is stubbed) and never uses a real key. */
const FAKE_KEY = 'tmFAKE0db0test0key00000000000000';
/** Every Ticketmaster id (events and venues) this suite creates contains this marker. */
const MARK = 'DATA4-TEST-';
const ARTS = { id: 'KZFzniwnSyZfZ7v7na', name: 'Arts & Theatre' };
const MUSIC = { id: 'KZFzniwnSyZfZ7v7nJ', name: 'Music' };

const venue = (suffix: string) => ({
  id: `${MARK}venue-${suffix}`,
  name: `Salle ${suffix}`,
  url: `https://www.ticketmaster.fr/fr/salle/${suffix}`,
  postalCode: '75004',
  city: { name: 'Paris' },
  address: { line1: '7 rue de Test' },
  location: { longitude: '2.357117', latitude: '48.857799' },
});

const tmEvent = (suffix: string, overrides: Record<string, unknown> = {}) => ({
  id: `${MARK}${suffix}`,
  name: `Spectacle ${suffix}`,
  test: false,
  url: `https://www.ticketmaster.fr/fr/manifestation/${suffix}`,
  description: `Description ${suffix}`,
  images: [{ url: `https://img/${suffix}.jpg`, width: 1024, fallback: false }],
  distance: 0.4,
  dates: {
    // 22:30 in Paris (summer time, UTC+2).
    start: { localDate: '2026-10-03', localTime: '22:30:00', dateTime: '2026-10-03T20:30:00Z' },
    timezone: 'Europe/Paris',
    status: { code: 'onsale' },
  },
  classifications: [{ primary: true, segment: ARTS, genre: { name: 'Theatre' } }],
  priceRanges: [{ type: 'standard', currency: 'EUR', min: 20, max: 35 }],
  _embedded: { venues: [venue('A')] },
  ...overrides,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const search = (events: unknown[]) => json({ _embedded: { events }, page: { number: 0 } });

const QUERY = { latitude: 48.8566, longitude: 2.3522, radiusMeters: 2000 };

/**
 * DATA-4 end to end on PostgreSQL: Ticketmaster-like responses (fetch stubbed) → client → adapter → NormalizedEvent →
 * EventIngestionService (and PlaceIngestionService for venues) → repositories → the test database. Non-destructive: no
 * reset, no TRUNCATE; it creates only events and venues whose Ticketmaster id contains MARK (plus a test experience and
 * missing categories/provider), removes exactly those at the end, and checks the rest of the catalog is unchanged.
 */
describe('Ticketmaster ingestion on PostgreSQL', () => {
  let db: PrismaClient;
  let ingestion: EventIngestionService;
  let adapter: TicketmasterAdapter;
  let enrichment: RoamEnrichmentService;
  let close: () => Promise<void>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let createdCategories: string[] = [];
  let createdProvider = false;
  let experienceId: string | undefined;
  let untouchedBefore: {
    places: number;
    events: number;
    experiences: string;
    enrichments: string;
    sources: number;
  };

  const marked = { sources: { some: { externalId: { contains: MARK } } } };

  const untouched = async () => ({
    places: await db.place.count({ where: { NOT: marked } }),
    events: await db.event.count({ where: { NOT: marked } }),
    experiences: JSON.stringify(
      await db.experience.findMany({
        where: experienceId ? { id: { not: experienceId } } : {},
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    enrichments: JSON.stringify(
      await db.roamEnrichment.findMany({
        where: { NOT: { place: marked } },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      }),
    ),
    sources: await db.externalSource.count({ where: { NOT: { externalId: { contains: MARK } } } }),
  });

  const eventSource = (suffix: string) =>
    db.externalSource.findMany({
      where: { entityType: 'EVENT', externalId: `${MARK}${suffix}` },
      include: { provider: true, event: { include: { category: true, place: true } } },
    });

  async function removeTestRecords() {
    await db.event.deleteMany({ where: marked });
    await db.place.deleteMany({ where: marked });
  }

  beforeAll(async () => {
    // A fictional key, set before the configuration is loaded (setup-env.ts removed any real one).
    process.env.TICKETMASTER_API_KEY = FAKE_KEY;
    const { AppModule } = await import('../../src/app.module.js');
    db = createTestClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    close = () => moduleRef.close();
    ingestion = moduleRef.get(EventIngestionService);
    adapter = moduleRef.get(TicketmasterAdapter);
    enrichment = moduleRef.get(RoamEnrichmentService);

    await removeTestRecords();
    const existing = new Set((await db.category.findMany()).map(({ slug }) => slug));
    createdCategories = ['culture', 'park'].filter((slug) => !existing.has(slug));
    for (const slug of createdCategories) await db.category.create({ data: { slug } });
    createdProvider = !(await db.provider.findUnique({ where: { key: 'ticketmaster' } }));
    untouchedBefore = await untouched();
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Every request went to Ticketmaster with the fictional key — never anywhere else.
    for (const [url] of fetchMock.mock.calls as [string][]) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://app.ticketmaster.com');
      // Compared as a boolean: an assertion diff must never print a key.
      expect(parsed.searchParams.get('apikey') === FAKE_KEY).toBe(true);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await removeTestRecords();
    if (experienceId) await db.experience.delete({ where: { id: experienceId } });
    if (createdProvider)
      await db.provider.deleteMany({ where: { key: 'ticketmaster', sources: { none: {} } } });
    for (const slug of createdCategories) await db.category.delete({ where: { slug } });
    await close();
    await db.$disconnect();
    delete process.env.TICKETMASTER_API_KEY;
  });

  it('first import creates the event, its provenance, category and venue (a Ticketmaster place)', async () => {
    fetchMock.mockResolvedValue(search([tmEvent('1'), tmEvent('2')]));

    const report = await ingestion.importNearby(adapter, QUERY);

    expect(report).toMatchObject({ created: 2, updated: 0 });
    const [source] = await eventSource('1');
    expect(source.provider).toMatchObject({ key: 'ticketmaster', name: 'Ticketmaster' });
    expect(source).toMatchObject({
      entityType: 'EVENT',
      externalUrl: 'https://www.ticketmaster.fr/fr/manifestation/1',
      providerCategories: ['segment:Arts & Theatre', 'genre:Theatre'],
    });
    expect(source.event).toMatchObject({
      title: 'Spectacle 1',
      description: 'Description 1',
      endDate: null,
      timezone: 'Europe/Paris',
      images: ['https://img/1.jpg'],
      currency: 'EUR',
      priceLevel: 'UNKNOWN',
      bookingUrl: 'https://www.ticketmaster.fr/fr/manifestation/1',
      isActive: true,
      experienceId: null,
      category: { slug: 'culture' },
      place: {
        name: 'Salle A',
        address: '7 rue de Test, 75004 Paris',
        city: 'Paris',
        latitude: 48.857799,
        longitude: 2.357117,
      },
    });
    expect(source.event?.priceMin?.toNumber()).toBe(20);
    expect(source.event?.priceMax?.toNumber()).toBe(35);
    // Both events share one venue place, identified by the Ticketmaster venue id.
    const venues = await db.externalSource.findMany({
      where: { entityType: 'PLACE', externalId: `${MARK}venue-A` },
    });
    expect(venues).toHaveLength(1);
    const [second] = await eventSource('2');
    expect(second.event?.placeId).toBe(venues[0].placeId);
  });

  it('dates: stored as the exact instant; PostgreSQL and Prisma read back 22:30 Paris time, no shift', async () => {
    const [source] = await eventSource('1');
    expect(source.event?.startDate?.toISOString()).toBe('2026-10-03T20:30:00.000Z');
    const [row] = await db.$queryRaw<{ paris: string; utc: string }[]>`
      SELECT to_char("startDate" AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI') AS paris,
             to_char("startDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS utc
      FROM events WHERE id = ${source.eventId}::uuid`;
    expect(row).toEqual({ paris: '2026-10-03 22:30', utc: '2026-10-03 20:30' });
    // DATA-6: the local date and time are derived from the instant in its zone, and read back as stored.
    expect(source.event).toMatchObject({ localStartTime: '22:30', timezone: 'Europe/Paris' });
    expect(source.event?.localStartDate?.toISOString().slice(0, 10)).toBe('2026-10-03');
  });

  it('a second import of the same Ticketmaster id updates the same event: no duplicate (idempotent)', async () => {
    const [before] = await eventSource('1');
    fetchMock.mockImplementation(() => search([tmEvent('1'), tmEvent('2')]));

    const report = await ingestion.importNearby(adapter, QUERY);

    // DATA-6: identical events → `unchanged` (only `fetchedAt` moved).
    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
    const rows = await eventSource('1');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(before.id);
    expect(rows[0].eventId).toBe(before.eventId);
    expect(rows[0].fetchedAt.getTime()).toBeGreaterThanOrEqual(before.fetchedAt.getTime());
    expect(await db.event.count({ where: marked })).toBe(2);
  });

  it('update: same event id, provider facts refreshed (title, dates, prices)', async () => {
    const [before] = await eventSource('1');
    fetchMock.mockResolvedValue(
      json(
        tmEvent('1', {
          name: 'Spectacle 1 (reporté)',
          dates: {
            start: { dateTime: '2026-11-07T19:00:00Z' },
            end: { dateTime: '2026-11-07T21:00:00Z' },
            timezone: 'Europe/Paris',
            status: { code: 'rescheduled' },
          },
          priceRanges: [{ type: 'standard', currency: 'EUR', min: 25, max: 40 }],
        }),
      ),
    );

    const result = await ingestion.importEvent(adapter, `${MARK}1`);

    expect(result?.outcome).toBe('updated');
    expect(result?.event.id).toBe(before.eventId);
    expect(result?.event).toMatchObject({
      title: 'Spectacle 1 (reporté)',
      startDate: new Date('2026-11-07T19:00:00Z'),
      endDate: new Date('2026-11-07T21:00:00Z'),
      priceMin: 25,
      priceMax: 40,
      isActive: true,
    });
  });

  it('ROAM data survives a refresh: experience link, ROAM category, venue enrichment', async () => {
    const [{ eventId, event }] = await eventSource('2');
    const experience = await db.experience.create({ data: { title: `${MARK}experience` } });
    experienceId = experience.id;
    const park = await db.category.findUniqueOrThrow({ where: { slug: 'park' } });
    await db.event.update({
      where: { id: eventId! },
      data: { experienceId, categoryId: park.id },
    });
    await db.roamEnrichment.create({
      data: { placeId: event!.placeId!, tags: ['salle intimiste'], source: 'CURATED' },
    });
    fetchMock.mockResolvedValue(json(tmEvent('2', { name: 'Spectacle 2 (v2)' })));

    await ingestion.importEvent(adapter, `${MARK}2`);

    const [after] = await eventSource('2');
    expect(after.event).toMatchObject({
      title: 'Spectacle 2 (v2)',
      experienceId,
      category: { slug: 'park' },
    });
    await expect(enrichment.enrichPlace(event!.placeId!)).resolves.toMatchObject({
      outcome: 'kept_curated',
      enrichment: { tags: ['salle intimiste'] },
    });
  });

  it('concurrent imports of a new Ticketmaster id create one event and one source (and one venue)', async () => {
    fetchMock.mockImplementation(() => json(tmEvent('3', { _embedded: { venues: [venue('C')] } })));

    const results = await Promise.all([
      ingestion.importEvent(adapter, `${MARK}3`),
      ingestion.importEvent(adapter, `${MARK}3`),
      ingestion.importEvent(adapter, `${MARK}3`),
    ]);

    expect(new Set(results.map((result) => result?.event.id)).size).toBe(1);
    expect(results.filter((result) => result?.outcome === 'created')).toHaveLength(1);
    expect(await db.externalSource.count({ where: { externalId: `${MARK}3` } })).toBe(1);
    expect(await db.event.count({ where: { sources: { some: { externalId: `${MARK}3` } } } })).toBe(
      1,
    );
    expect(await db.externalSource.count({ where: { externalId: `${MARK}venue-C` } })).toBe(1);
  });

  it('categories: an unmapped segment (Music) → no ROAM category, the event is kept with its classification', async () => {
    fetchMock.mockResolvedValue(
      json(
        tmEvent('4', {
          classifications: [{ primary: true, segment: MUSIC, genre: { name: 'Rock' } }],
        }),
      ),
    );

    const result = await ingestion.importEvent(adapter, `${MARK}4`);

    expect(result?.event.categorySlug).toBeNull();
    const [source] = await eventSource('4');
    expect(source.providerCategories).toEqual(['segment:Music', 'genre:Rock']);
  });

  it('optional data missing: no venue, price, end, description, image or URL → stored as null/empty', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: `${MARK}5`,
        name: 'Minimal',
        dates: { start: { dateTime: '2026-10-10T18:00:00Z' } },
      }),
    );

    const result = await ingestion.importEvent(adapter, `${MARK}5`);

    expect(result?.event).toMatchObject({
      title: 'Minimal',
      description: null,
      endDate: null,
      timezone: null,
      images: [],
      priceMin: null,
      priceMax: null,
      currency: null,
      priceLevel: 'UNKNOWN',
      bookingUrl: null,
      placeId: null,
      categorySlug: null,
      isActive: true,
    });
  });

  it('a cancelled event is deactivated, not deleted', async () => {
    fetchMock.mockResolvedValue(
      json(tmEvent('1', { dates: { ...tmEvent('1').dates, status: { code: 'cancelled' } } })),
    );

    const result = await ingestion.importEvent(adapter, `${MARK}1`);

    expect(result?.event.isActive).toBe(false);
    expect(await db.event.count({ where: { id: result!.event.id } })).toBe(1);
  });

  it('an unknown Ticketmaster id (404) writes nothing', async () => {
    fetchMock.mockResolvedValue(
      json({ errors: [{ code: 'DIS1004', detail: 'Resource not found', status: '404' }] }, 404),
    );
    const before = await db.event.count({ where: marked });

    await expect(ingestion.importEvent(adapter, `${MARK}GONE`)).resolves.toBeNull();
    expect(await db.event.count({ where: marked })).toBe(before);
  });

  it('the rest of the catalog (DATA-1, Google, Geoapify, DATA-3 enrichments) is untouched', async () => {
    expect(await untouched()).toEqual(untouchedBefore);
  });
});
