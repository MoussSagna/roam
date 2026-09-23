import { parseDistanceMeters } from '@/features/home/lib/pickForYou';
import type { Category, Experience, SearchFilters, SearchSuggestion } from '@/types';

import type { SearchRepository } from '../repositories/types';

const MAX_SUGGESTIONS = 6;
const MAX_EXPERIENCE_SUGGESTIONS = 3;

/** Accent/case-insensitive normalization for French query text ("rooftop" must match "Rooftop", and
 * later an accented mock tag must match its unaccented query, or vice versa). */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function matchesQuery(
  experience: Experience,
  categorySlugById: ReadonlyMap<string, string>,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;

  const haystacks = [
    experience.title,
    experience.description,
    ...(experience.tags ?? []),
    ...experience.moods,
    ...experience.categoryIds.map((id) => categorySlugById.get(id) ?? ''),
  ];
  return haystacks.some((value) => normalize(value).includes(normalizedQuery));
}

/** Candidate filtering (`07_DATA_AND_RECOMMENDATION.md`): eliminate impossible candidates first —
 * category/budget/distance are real mock fields; `openNow`/`when`/`walkable` have no opening-hours
 * model to check against yet (mock display strings only), so they are accepted as a no-op today,
 * same "not decided yet" precedent as geolocation elsewhere in the mock layer. */
function passesFilters(experience: Experience, filters: SearchFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.categoryId && !experience.categoryIds.includes(filters.categoryId)) return false;
  if (filters.budget && experience.estimatedBudget !== filters.budget) return false;
  if (filters.maxDistanceKm !== undefined) {
    const distanceMeters = parseDistanceMeters(experience.distanceLabel);
    if (distanceMeters > filters.maxDistanceKm * 1000) return false;
  }
  return true;
}

/**
 * Deterministic, explainable search over the mock experience pool — no fuzzy/AI matching (sprint 6
 * brief §2: "moteur mocké dans ce sprint"). `services/mock/index.ts` wires this into
 * `createMockRepositories()`, same "in-memory pool, copies out like a real API would" convention as
 * every other mock repository.
 */
export function createMockSearchRepository(
  experiences: readonly Experience[],
  categories: readonly Category[],
): SearchRepository {
  const categorySlugById = new Map(categories.map((category) => [category.id, category.slug]));

  return {
    async suggest(query) {
      const normalizedQuery = normalize(query);
      if (!normalizedQuery) return [];

      const matched = experiences.filter((experience) =>
        matchesQuery(experience, categorySlugById, normalizedQuery),
      );

      const experienceSuggestions: SearchSuggestion[] = matched
        .slice(0, MAX_EXPERIENCE_SUGGESTIONS)
        .map((experience) => ({
          id: `experience-${experience.id}`,
          label: experience.title,
          type: 'experience',
          experienceId: experience.id,
        }));

      const remainingSlots = Math.max(MAX_SUGGESTIONS - experienceSuggestions.length, 0);
      const matchedTags = new Set(
        matched
          .flatMap((experience) => experience.tags ?? [])
          .filter((tag) => normalize(tag).includes(normalizedQuery)),
      );
      const textSuggestions: SearchSuggestion[] = Array.from(matchedTags)
        .slice(0, remainingSlots)
        .map((tag) => ({ id: `query-${tag}`, label: tag, type: 'query' }));

      return [...textSuggestions, ...experienceSuggestions];
    },

    async search(query, filters) {
      const normalizedQuery = normalize(query);
      const matches = experiences.filter(
        (experience) =>
          passesFilters(experience, filters) &&
          matchesQuery(experience, categorySlugById, normalizedQuery),
      );
      return structuredClone(matches);
    },
  };
}
