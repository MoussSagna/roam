import type { Category, Experience, Place } from '@/types';

/**
 * Data-access contracts. UI code depends on these interfaces only, never on `fetch`,
 * a mock or a backend SDK:
 *
 *   Screen -> hook / service -> Repository (interface) -> mock now, API later
 *
 * Add a repository here when its feature is built (favorites, feedback, itineraries…).
 */

export interface CategoryRepository {
  list(): Promise<Category[]>;
}

export interface PlaceRepository {
  getById(id: string): Promise<Place | null>;
}

export interface ExperienceRepository {
  list(): Promise<Experience[]>;
  getById(id: string): Promise<Experience | null>;
}

export type Repositories = {
  categories: CategoryRepository;
  places: PlaceRepository;
  experiences: ExperienceRepository;
};
