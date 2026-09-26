import { Injectable } from '@nestjs/common';

import { jsonInput } from '../../database/json.js';
import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { categoryLinks, PLACE_INCLUDE, sourceCreate, toPlace } from './catalog.mappers.js';
import type { NewPlace, Place, PlaceChange } from './catalog.types.js';

/**
 * Places (PLACE.md): provider facts, their categories and provenance. Written by the provider pipeline
 * (adapter → normalization → repository); a place no sync finds any more is deactivated, not deleted.
 */
@Injectable()
export class PlaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Place | null> {
    return persist(async () => {
      const row = await this.prisma.place.findUnique({ where: { id }, include: PLACE_INCLUDE });
      return row && toPlace(row);
    });
  }

  /** The place imported from this provider record — deduplication by provider id first (EXPERIENCE.md). */
  findBySource(providerKey: string, externalId: string): Promise<Place | null> {
    return persist(async () => {
      const source = await this.prisma.externalSource.findFirst({
        where: { entityType: 'PLACE', externalId, provider: { key: providerKey } },
        select: { place: { include: PLACE_INCLUDE } },
      });
      return source?.place ? toPlace(source.place) : null;
    });
  }

  /**
   * Creates the place with its categories and provenance in one write (atomic). A provider record already
   * imported: `UniqueConstraintError`; an unknown category slug: `RecordNotFoundError`.
   */
  create(place: NewPlace): Promise<Place> {
    const { categorySlugs, source, openingHours, attributes, ...fields } = place;
    return persist(async () =>
      toPlace(
        await this.prisma.place.create({
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            attributes: jsonInput(attributes),
            categories: categoryLinks(categorySlugs),
            sources: source ? { create: [sourceCreate(source, 'PLACE')] } : undefined,
          },
          include: PLACE_INCLUDE,
        }),
      ),
    );
  }

  /** Updates provider facts (or `isActive`). Throws `RecordNotFoundError` when the place does not exist. */
  update(id: string, change: PlaceChange): Promise<Place> {
    const { openingHours, attributes, ...fields } = change;
    return persist(async () =>
      toPlace(
        await this.prisma.place.update({
          where: { id },
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            attributes: jsonInput(attributes),
          },
          include: PLACE_INCLUDE,
        }),
      ),
    );
  }
}
