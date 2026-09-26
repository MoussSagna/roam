import type { Recommendations } from '@/types';

import type { RecommendationsDto } from '../dto';
import { type ExperienceMappingContext, mapExperienceDto } from './experience';

/**
 * API recommendations (`GET /recommendations`) → the app's `Recommendations`: each experience through the same
 * mapping as the catalog, the distance kept when the API knows it, reasons and relaxed constraints as they
 * come (the vocabularies are the same). The API's applied `context` is not kept: no screen shows it yet.
 */
export function mapRecommendationsDto(
  dto: RecommendationsDto,
  context: ExperienceMappingContext,
): Recommendations {
  return {
    items: dto.items.map((item) => ({
      experience: mapExperienceDto(item.experience, context),
      ...(item.distanceM === null ? {} : { distanceM: item.distanceM }),
      reasons: [...item.reasons],
    })),
    relaxed: [...dto.relaxed],
  };
}
