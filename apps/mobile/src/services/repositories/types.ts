import type { Category, Collection, Experience, Place, User } from '@/types';

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

export interface CollectionRepository {
  list(): Promise<Collection[]>;
  getById(id: string): Promise<Collection | null>;
}

export interface AuthRepository {
  /** Simulates a login request (no backend yet): always succeeds after a short delay. */
  login(): Promise<void>;
  logout(): Promise<void>;
}

export interface UserRepository {
  /** No real session/user endpoint yet: always returns the same mocked profile. */
  getCurrentUser(): Promise<User>;
}

export type Repositories = {
  categories: CategoryRepository;
  places: PlaceRepository;
  experiences: ExperienceRepository;
  collections: CollectionRepository;
  auth: AuthRepository;
  users: UserRepository;
};
