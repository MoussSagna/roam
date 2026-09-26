import { Injectable } from '@nestjs/common';

import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { EVENT_INCLUDE, sourceCreate, toEvent } from './catalog.mappers.js';
import type { Event, EventChange, NewEvent } from './catalog.types.js';

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
            ...fields,
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
            ...fields,
            experience: relation(experienceId),
            place: relation(placeId),
          },
          include: EVENT_INCLUDE,
        }),
      ),
    );
  }
}
