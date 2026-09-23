import type {
  Category,
  Collection,
  Experience,
  Place,
  SearchFilters,
  SearchSuggestion,
  User,
} from '@/types';

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

export interface SearchRepository {
  /** Short, capped list of query-text and experience suggestions for a partial query (sprint 6 §5). */
  suggest(query: string): Promise<SearchSuggestion[]>;
  /** Deterministic text + facet matching over the experience pool (sprint 6 §2: no real query engine
   * this sprint). */
  search(query: string, filters?: SearchFilters): Promise<Experience[]>;
}

export type Repositories = {
  categories: CategoryRepository;
  places: PlaceRepository;
  experiences: ExperienceRepository;
  collections: CollectionRepository;
  auth: AuthRepository;
  users: UserRepository;
  search: SearchRepository;
};
