import { Injectable } from '@nestjs/common';

import { jsonInput } from '../../database/json.js';
import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  categoryLinks,
  EXPERIENCE_DETAIL_INCLUDE,
  EXPERIENCE_INCLUDE,
  toExperience,
  toExperienceDetail,
} from './catalog.mappers.js';
import type {
  Experience,
  ExperienceChange,
  ExperienceDetail,
  NewExperience,
} from './catalog.types.js';

/** Plain data filters of a catalog list. Matching a user's context, scoring and ranking are not here. */
export type ExperienceFilter = {
  city?: string;
  categorySlug?: string;
  /**
   * Keeps experiences whose lowest price (`priceMin`) is at most this amount — and those without a known price
   * (a missing fact never excludes: DATA_RULES.md, RECOMMENDATION.md "genuine constraints").
   */
  maxPrice?: number;
  /** Case-insensitive substring of the title or the description. */
  text?: string;
  /**
   * Keeps experiences whose anchor point is inside the box, and those without coordinates. The exact distance is
   * the service's job (DATABASE_SCHEMA.md → "Geography": filter a box, then compute distances).
   */
  area?: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number };
};

function whereActive(filter: ExperienceFilter): Prisma.ExperienceWhereInput {
  const { area } = filter;
  return {
    isActive: true,
    city: filter.city,
    categories: filter.categorySlug
      ? { some: { category: { slug: filter.categorySlug } } }
      : undefined,
    AND: [
      filter.maxPrice === undefined
        ? {}
        : { OR: [{ priceMin: null }, { priceMin: { lte: filter.maxPrice } }] },
      filter.text
        ? {
            OR: [
              { title: { contains: filter.text, mode: 'insensitive' } },
              { description: { contains: filter.text, mode: 'insensitive' } },
            ],
          }
        : {},
      area
        ? {
            OR: [
              { latitude: null },
              { longitude: null },
              {
                latitude: { gte: area.minLatitude, lte: area.maxLatitude },
                longitude: { gte: area.minLongitude, lte: area.maxLongitude },
              },
            ],
          }
        : {},
    ],
  };
}

/**
 * Experiences (EXPERIENCE.md): what ROAM recommends, with their ordered places, categories and ROAM context.
 * The repository fetches and filters data; candidate selection, scoring and ranking belong to the future
 * recommendation service (RECOMMENDATION.md).
 */
@Injectable()
export class ExperienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The experience with its places, in order. Inactive ones too (journeys and favorites keep them). */
  findById(id: string): Promise<ExperienceDetail | null> {
    return persist(async () => {
      const row = await this.prisma.experience.findUnique({
        where: { id },
        include: EXPERIENCE_DETAIL_INCLUDE,
      });
      return row && toExperienceDetail(row);
    });
  }

  /**
   * Several experiences by id (the steps of a journey, the favorites of a user), in the order of `ids`;
   * unknown ids are skipped. Inactive ones are included: a journey or a favorite keeps pointing at them.
   */
  findManyByIds(ids: string[]): Promise<Experience[]> {
    return persist(async () => {
      if (ids.length === 0) return [];
      const rows = await this.prisma.experience.findMany({
        where: { id: { in: ids } },
        include: EXPERIENCE_INCLUDE,
      });
      const byId = new Map(rows.map((row) => [row.id, toExperience(row)]));
      return ids.flatMap((id) => byId.get(id) ?? []);
    });
  }

  /** Active experiences, oldest first (a stable order for cursor pagination). */
  listActive(filter: ExperienceFilter = {}, page?: PageRequest): Promise<Page<Experience>> {
    return persist(async () => {
      const { limit, args } = pageArgs(page);
      const rows = await this.prisma.experience.findMany({
        where: whereActive(filter),
        orderBy: { id: 'asc' },
        include: EXPERIENCE_INCLUDE,
        ...args,
      });
      return toPage(rows, limit, toExperience);
    });
  }

  /**
   * Recommendation candidates: active experiences matching the filter, at most `max`, in a stable order (id). One
   * query with the relations (no N+1). Filtering on the user's context and ranking are the service's job.
   */
  findCandidates(filter: ExperienceFilter, max: number): Promise<Experience[]> {
    return persist(async () => {
      const rows = await this.prisma.experience.findMany({
        where: whereActive(filter),
        orderBy: { id: 'asc' },
        include: EXPERIENCE_INCLUDE,
        take: max,
      });
      return rows.map(toExperience);
    });
  }

  /**
   * Creates the experience with its ordered places and categories in one write (atomic). An unknown place:
   * `ForeignKeyConstraintError`; an unknown category slug: `RecordNotFoundError`.
   */
  create(experience: NewExperience): Promise<ExperienceDetail> {
    const { categorySlugs, placeIds, openingHours, ...fields } = experience;
    return persist(async () =>
      toExperienceDetail(
        await this.prisma.experience.create({
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            categories: categoryLinks(categorySlugs),
            places: placeIds?.length
              ? { create: placeIds.map((placeId, position) => ({ placeId, position })) }
              : undefined,
          },
          include: EXPERIENCE_DETAIL_INCLUDE,
        }),
      ),
    );
  }

  /** Updates its own fields (or `isActive`). Throws `RecordNotFoundError` when it does not exist. */
  update(id: string, change: ExperienceChange): Promise<ExperienceDetail> {
    const { openingHours, ...fields } = change;
    return persist(async () =>
      toExperienceDetail(
        await this.prisma.experience.update({
          where: { id },
          data: { ...fields, openingHours: jsonInput(openingHours) },
          include: EXPERIENCE_DETAIL_INCLUDE,
        }),
      ),
    );
  }
}
