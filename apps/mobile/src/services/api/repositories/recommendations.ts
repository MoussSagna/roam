import type { RecommendationContext } from '@/types';

import type { RecommendationRepository } from '../../repositories/types';
import { mapRecommendationsDto } from '../adapters/recommendation';
import type { ExperienceMappingContext } from '../adapters/experience';
import type { ApiClient } from '../apiClient';
import type { RecommendationsDto } from '../dto';

/**
 * `RecommendationRepository` on `GET /recommendations` (EXPERIENCE_CATALOG_API.md → "Recommendations"): the app
 * sends what it knows, the API completes it from the saved preferences, filters, ranks and explains. Nothing is
 * ranked again here.
 *
 * - Budget and company are the API's own vocabularies; the category id becomes its slug.
 * - `mood` is not sent: the API has no mood model yet.
 * - Unknown values are left out (the client drops `undefined`), never replaced by a default.
 */
export function createApiRecommendationRepository(
  client: ApiClient,
  context: ExperienceMappingContext,
): RecommendationRepository {
  const slugById = new Map(context.categories.map((category) => [category.id, category.slug]));

  return {
    async recommend(request: RecommendationContext) {
      const dto = await client.get<RecommendationsDto>('/recommendations', {
        query: {
          latitude: request.location?.latitude,
          longitude: request.location?.longitude,
          maxDistanceKm: request.location ? request.maxDistanceKm : undefined,
          budget: request.budget,
          availableMinutes: request.availableMinutes,
          company: request.company,
          category: request.categoryId
            ? (slugById.get(request.categoryId) ?? request.categoryId)
            : undefined,
          limit: request.limit,
        },
      });
      return mapRecommendationsDto(dto, context);
    },
  };
}
