import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiException, ErrorCode } from '../../common/errors/api-error.js';
import type { Page } from '../../database/pagination.js';
import type { Experience, ExperienceDetail } from '../catalog/catalog.types.js';
import { ExperienceRepository } from '../catalog/experience.repository.js';
import { type Budget, BUDGET_CEILING_EUR } from './api-values.js';

export type ExperienceListQuery = {
  category?: string;
  city?: string;
  budget?: Budget;
  q?: string;
  limit?: number;
  cursor?: string;
};

/**
 * The experience catalog as the apps browse it (EXPERIENCE_CATALOG_API.md): a filtered, paginated list of active
 * experiences and the detail of one. Plain data filters only — matching a user's context is the recommendation
 * service's job.
 */
@Injectable()
export class ExperiencesService {
  constructor(private readonly experiences: ExperienceRepository) {}

  list(query: ExperienceListQuery): Promise<Page<Experience>> {
    return this.experiences.listActive(
      {
        categorySlug: query.category,
        city: query.city,
        maxPrice: query.budget && BUDGET_CEILING_EUR[query.budget],
        text: query.q,
      },
      { limit: query.limit, cursor: query.cursor },
    );
  }

  /** Inactive experiences are returned too (history, favorites and journeys keep pointing at them). */
  async get(id: string): Promise<ExperienceDetail> {
    const experience = await this.experiences.findById(id);
    if (!experience) {
      throw new ApiException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Experience not found.');
    }
    return experience;
  }
}
