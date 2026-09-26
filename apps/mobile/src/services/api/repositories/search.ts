import type { SearchSuggestion } from '@/types';

import type { SearchRepository } from '../../repositories/types';
import { type ExperienceMappingContext, mapExperienceDto } from '../adapters/experience';
import type { ApiClient } from '../apiClient';
import type { ExperienceDto } from '../dto';
import { fetchAllPages, fetchPage } from '../pagination';

/** The API's `q` bounds (2–100 characters). */
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const MAX_EXPERIENCE_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 6;
/** Matches read to build suggestions from (one request). */
const SUGGESTION_POOL = 20;

function apiQuery(query: string): string | undefined {
  const text = query.trim().slice(0, MAX_QUERY_LENGTH);
  return text.length >= MIN_QUERY_LENGTH ? text : undefined;
}

/**
 * `SearchRepository` on the catalog API (`GET /experiences?q=&category=&budget=`) — in API mode Search must
 * read the same catalog as the rest of the app, or a result would open an experience the API does not know.
 *
 * What the API supports decides what applies (EXPERIENCE_CATALOG_API.md → "Mobile contract"):
 * - text (`q`): title or description, case-insensitive, **accent-sensitive**; below 2 characters no text
 *   filter is sent;
 * - category and budget: sent (`budget` keeps what fits the bracket's ceiling or has no known price — wider
 *   than the mock's exact bracket);
 * - `maxDistanceKm`, `when`, `openNow`, `walkable`: not supported by this endpoint (no position in a
 *   catalog query, no opening-hours model) — not applied, as the mock already did for the last three.
 *
 * Suggestions: no suggestion endpoint exists; they come from one search request (experience titles, then
 * the matching tags of those experiences, like the mock).
 */
export function createApiSearchRepository(
  client: ApiClient,
  context: ExperienceMappingContext,
): SearchRepository {
  const slugById = new Map(context.categories.map((category) => [category.id, category.slug]));

  return {
    async suggest(query) {
      const q = apiQuery(query);
      if (!q) return [];
      const page = await fetchPage<ExperienceDto>(client, '/experiences', {
        q,
        limit: SUGGESTION_POOL,
      });

      const experienceSuggestions: SearchSuggestion[] = page.items
        .slice(0, MAX_EXPERIENCE_SUGGESTIONS)
        .map((dto) => ({
          id: `experience-${dto.id}`,
          label: dto.title,
          type: 'experience',
          experienceId: dto.id,
        }));

      const lowerQuery = q.toLowerCase();
      const tags = new Set(
        page.items
          .flatMap((dto) => dto.roam?.tags ?? [])
          .filter((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
      const textSuggestions: SearchSuggestion[] = Array.from(tags)
        .slice(0, Math.max(MAX_SUGGESTIONS - experienceSuggestions.length, 0))
        .map((tag) => ({ id: `query-${tag}`, label: tag, type: 'query' }));

      return [...textSuggestions, ...experienceSuggestions];
    },

    async search(query, filters) {
      const items = await fetchAllPages<ExperienceDto>(client, '/experiences', {
        q: apiQuery(query),
        category: filters?.categoryId
          ? (slugById.get(filters.categoryId) ?? filters.categoryId)
          : undefined,
        budget: filters?.budget,
      });
      return items.map((dto) => mapExperienceDto(dto, context));
    },
  };
}
