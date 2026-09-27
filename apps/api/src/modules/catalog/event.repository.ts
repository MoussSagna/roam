import { Injectable } from '@nestjs/common';

import { lockKeys } from '../../database/advisory-lock.js';
import { jsonInput } from '../../database/json.js';
import { toDbDate } from '../../database/local-date.js';
import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist, RecordNotFoundError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ensureProviderId } from '../../database/provider-rows.js';
import type { PriceLevel } from '../../generated/prisma/enums.js';
import { EVENT_INCLUDE, imagesJson, sourceCreate, toEvent } from './catalog.mappers.js';
import type { Event, EventChange, NewEvent, SourceInput } from './catalog.types.js';

/** An event's provider facts (DATA-6): written on every refresh of its (single) source. */
export type EventFacts = {
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  localStartDate: string | null;
  localStartTime: string | null;
  localEndDate: string | null;
  localEndTime: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  priceLevel: PriceLevel;
  bookingUrl: string | null;
  isActive: boolean;
};

export type EventUpsert = {
  facts: EventFacts;
  /** Venue place; `undefined` keeps the current link (a venue not locatable this time is not dropped). */
  placeId?: string;
  /** ROAM category, set at creation only. */
  categorySlug: string | null;
  source: SourceInput;
};

export type EventUpsertOutcome = 'created' | 'updated' | 'unchanged';

const EVENT_FACT_KEYS = [
  'title',
  'description',
  'startDate',
  'endDate',
  'timezone',
  'localStartDate',
  'localStartTime',
  'localEndDate',
  'localEndTime',
  'address',
  'city',
  'latitude',
  'longitude',
  'images',
  'priceMin',
  'priceMax',
  'currency',
  'priceLevel',
  'bookingUrl',
  'isActive',
] as const satisfies readonly (keyof EventFacts)[];

/** Event facts as Prisma columns (calendar dates as `date`). */
function factsData<T extends { localStartDate?: string | null; localEndDate?: string | null }>(
  facts: T,
) {
  const { localStartDate, localEndDate, ...rest } = facts;
  // `undefined` stays `undefined`: the column is left unchanged.
  return {
    ...rest,
    localStartDate: toDbDate(localStartDate),
    localEndDate: toDbDate(localEndDate),
  };
}

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date || b instanceof Date
    ? (a as Date | null)?.getTime() === (b as Date | null)?.getTime()
    : JSON.stringify(a) === JSON.stringify(b);

/** `undefined` → unchanged, `null` → unlinked, an id → linked. */
function relation(id: string | null | undefined) {
  if (id === undefined) return undefined;
  return id === null ? { disconnect: true } : { connect: { id } };
}

/**
 * Events (EVENT.md): time-bound, with an optional venue (`Place`) and experience. Written by the provider
 * pipeline (Ticketmaster, open data); never an invented end time or price.
 */
@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Event | null> {
    return persist(async () => {
      const row = await this.prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
      return row && toEvent(row);
    });
  }

  /** The event imported from this provider record (deduplication by provider id first). */
  findBySource(providerKey: string, externalId: string): Promise<Event | null> {
    return persist(async () => {
      const source = await this.prisma.externalSource.findFirst({
        where: { entityType: 'EVENT', externalId, provider: { key: providerKey } },
        select: { event: { include: EVENT_INCLUDE } },
      });
      return source?.event ? toEvent(source.event) : null;
    });
  }

  /** Active events starting in `[from, to)`, soonest first ("what's on"). */
  listUpcoming(range: { from: Date; to?: Date }, page?: PageRequest): Promise<Page<Event>> {
    return persist(async () => {
      const { limit, args } = pageArgs(page);
      const rows = await this.prisma.event.findMany({
        where: { isActive: true, startDate: { gte: range.from, lt: range.to } },
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        include: EVENT_INCLUDE,
        ...args,
      });
      return toPage(rows, limit, toEvent);
    });
  }

  /**
   * Creates the event with its venue, experience, category and provenance in one write (atomic). Unknown
   * place, experience or category: `RecordNotFoundError`; a provider record already imported:
   * `UniqueConstraintError`.
   */
  create(event: NewEvent): Promise<Event> {
    const { experienceId, placeId, categorySlug, source, ...fields } = event;
    return persist(async () =>
      toEvent(
        await this.prisma.event.create({
          data: {
            ...factsData(fields),
            experience: experienceId ? { connect: { id: experienceId } } : undefined,
            place: placeId ? { connect: { id: placeId } } : undefined,
            category: categorySlug ? { connect: { slug: categorySlug } } : undefined,
            sources: source ? { create: [sourceCreate(source, 'EVENT')] } : undefined,
          },
          include: EVENT_INCLUDE,
        }),
      ),
    );
  }

  /** Updates the event (or `isActive`, its venue, its experience). `RecordNotFoundError` when unknown. */
  update(id: string, change: EventChange): Promise<Event> {
    const { experienceId, placeId, ...fields } = change;
    return persist(async () =>
      toEvent(
        await this.prisma.event.update({
          where: { id },
          data: {
            ...factsData(fields),
            experience: relation(experienceId),
            place: relation(placeId),
          },
          include: EVENT_INCLUDE,
        }),
      ),
    );
  }

  /**
   * A provider refresh (DATA-4): updates the provider facts, the venue link when given, and that provider record's
   * provenance (`fetchedAt`, URL, classification) in one write (atomic). Never touches the category, the experience
   * link or other sources. Throws `RecordNotFoundError` when the event does not exist.
   */
  updateFromSource(
    id: string,
    change: Omit<EventChange, 'experienceId'>,
    source: SourceInput,
  ): Promise<Event> {
    const { placeId, ...fields } = change;
    return persist(async () => {
      // Nested writes filter on scalars only: resolve the provider (an immutable row) first.
      const provider = await this.prisma.provider.findUnique({
        where: { key: source.provider.key },
        select: { id: true },
      });
      if (!provider) throw new RecordNotFoundError('Provider');
      return toEvent(
        await this.prisma.event.update({
          where: { id },
          data: {
            ...factsData(fields),
            place: relation(placeId),
            sources: {
              updateMany: {
                where: {
                  entityType: 'EVENT',
                  externalId: source.externalId,
                  providerId: provider.id,
                },
                data: {
                  externalUrl: source.externalUrl ?? null,
                  providerCategories: source.providerCategories ?? [],
                  confidence: source.confidence ?? null,
                  fetchedAt: source.fetchedAt,
                  providerUpdatedAt: source.providerUpdatedAt ?? null,
                },
              },
            },
          },
          include: EVENT_INCLUDE,
        }),
      );
    });
  }

  /**
   * The DATA-6 write path of every provider event, in one transaction locked on the provider record (concurrent imports
   * of one event never both create): known record → provider facts, venue link and that source's provenance
   * (`unchanged` when nothing but `fetchedAt` moved); new record → the event with its category and provenance. Never
   * touches the ROAM category or the experience link of an existing event. No cross-provider event merge (DATA-6
   * "Deduplication").
   */
  upsertFromSource(input: EventUpsert): Promise<{ event: Event; outcome: EventUpsertOutcome }> {
    const { source, facts } = input;
    return persist(async () => {
      const providerId = await ensureProviderId(this.prisma, source.provider);
      return this.prisma.$transaction(async (tx) => {
        await lockKeys(tx, [`event-source:${source.provider.key}:${source.externalId}`]);
        const existing = await tx.externalSource.findUnique({
          where: {
            providerId_entityType_externalId: {
              providerId,
              entityType: 'EVENT',
              externalId: source.externalId,
            },
          },
        });

        if (!existing?.eventId) {
          const row = await tx.event.create({
            data: {
              ...factsData(facts),
              place: input.placeId ? { connect: { id: input.placeId } } : undefined,
              category: input.categorySlug ? { connect: { slug: input.categorySlug } } : undefined,
              sources: { create: [sourceCreate(source, 'EVENT')] },
            },
            include: EVENT_INCLUDE,
          });
          return { event: toEvent(row), outcome: 'created' as const };
        }

        const current = toEvent(
          await tx.event.findUniqueOrThrow({
            where: { id: existing.eventId },
            include: EVENT_INCLUDE,
          }),
        );
        const changed: Partial<EventFacts> = {};
        for (const key of EVENT_FACT_KEYS) {
          if (!sameValue(current[key], facts[key])) Object.assign(changed, { [key]: facts[key] });
        }
        const placeChanged = input.placeId !== undefined && input.placeId !== current.placeId;
        const obsoleteAt = source.obsoleteAt ? (existing.obsoleteAt ?? source.obsoleteAt) : null;
        const sourceData = {
          externalUrl: source.externalUrl ?? null,
          providerCategories: source.providerCategories ?? [],
          confidence: source.confidence ?? null,
          providerUpdatedAt: source.providerUpdatedAt ?? null,
          attribution: source.attribution ?? null,
          obsoleteAt,
          ...(source.images !== undefined ? { images: jsonInput(imagesJson(source.images)) } : {}),
        };
        const sourceChanged =
          existing.externalUrl !== sourceData.externalUrl ||
          !sameValue(existing.providerCategories, sourceData.providerCategories) ||
          existing.confidence !== sourceData.confidence ||
          !sameValue(existing.providerUpdatedAt, sourceData.providerUpdatedAt) ||
          existing.attribution !== sourceData.attribution ||
          (existing.obsoleteAt === null) !== (obsoleteAt === null) ||
          (source.images !== undefined &&
            !sameValue(existing.images ?? null, imagesJson(source.images) ?? null));

        await tx.externalSource.update({
          where: { id: existing.id },
          data: { ...sourceData, fetchedAt: source.fetchedAt },
        });
        if (Object.keys(changed).length > 0 || placeChanged) {
          await tx.event.update({
            where: { id: existing.eventId },
            data: {
              ...factsData(changed),
              ...(placeChanged ? { place: { connect: { id: input.placeId } } } : {}),
            },
          });
        }
        const row = await tx.event.findUniqueOrThrow({
          where: { id: existing.eventId },
          include: EVENT_INCLUDE,
        });
        const outcome =
          sourceChanged || placeChanged || Object.keys(changed).length > 0
            ? 'updated'
            : 'unchanged';
        return { event: toEvent(row), outcome: outcome as EventUpsertOutcome };
      });
    });
  }
}
