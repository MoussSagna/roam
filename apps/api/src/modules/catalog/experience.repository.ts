import { Injectable } from '@nestjs/common';

import { jsonInput } from '../../database/json.js';
import { pageArgs, type Page, type PageRequest, toPage } from '../../database/pagination.js';
import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
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
};

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
        where: {
          isActive: true,
          city: filter.city,
          categories: filter.categorySlug
            ? { some: { category: { slug: filter.categorySlug } } }
            : undefined,
        },
        orderBy: { id: 'asc' },
        include: EXPERIENCE_INCLUDE,
        ...args,
      });
      return toPage(rows, limit, toExperience);
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
