import type { Experience } from '@/types';

import type { ExperienceRepository } from '../../repositories/types';
import { type ExperienceMappingContext, mapExperienceDto } from '../adapters/experience';
import type { ApiClient } from '../apiClient';
import { isApiError } from '../apiError';
import type { ExperienceDto } from '../dto';
import { fetchAllPages } from '../pagination';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `ExperienceRepository` on the catalog API (`GET /api/v1/experiences`, `/experiences/:id`). Same contract as
 * the mock: `list()` is the whole active catalog, `getById()` answers `null` for an unknown experience.
 *
 * Several screens ask for the list when the app opens (Home, Discover, the Parcours tab): calls made while
 * one is already in flight share it — one request, not one per screen. Nothing is cached after it resolves:
 * the next screen that asks gets fresh data.
 */
export function createApiExperienceRepository(
  client: ApiClient,
  context: ExperienceMappingContext,
): ExperienceRepository {
  let inFlight: Promise<Experience[]> | null = null;

  async function fetchCatalog(): Promise<Experience[]> {
    const items = await fetchAllPages<ExperienceDto>(client, '/experiences');
    return items.map((dto) => mapExperienceDto(dto, context));
  }

  return {
    async list() {
      if (!inFlight) {
        inFlight = fetchCatalog().finally(() => {
          inFlight = null;
        });
      }
      // Each caller gets its own copy, like the mock: one screen cannot change another's data.
      return structuredClone(await inFlight);
    },

    async getById(id) {
      // Catalog ids are UUIDs; anything else (an old mock id kept by a local journey, a bad link) cannot
      // exist — answered like an unknown id without a request.
      if (!UUID_PATTERN.test(id)) return null;
      try {
        const dto = await client.get<ExperienceDto>(`/experiences/${encodeURIComponent(id)}`);
        return mapExperienceDto(dto, context);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
  };
}
