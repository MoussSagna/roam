import type {
  Category,
  Collection,
  Experience,
  Journey,
  JourneyFeedback,
  JourneyFeedbackInput,
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

/**
 * The user's journey (sprint 10). MVP: a single current journey — active or completed — plus the
 * completed ones (history, sprint 11); a draft is never saved (it lives in the creation flow until
 * "Créer mon parcours"). Planning (travel, times, totals) is domain logic in `features/journey`, so a
 * backend implementation only stores.
 */
export interface JourneyRepository {
  /** The current journey (active or completed), or `null` when there is none. */
  getCurrent(): Promise<Journey | null>;
  /** Creates or replaces the current journey. A completed journey is also kept in the history. */
  save(journey: Journey): Promise<Journey>;
  /** Completed journeys (sprint 11), most recently completed first — they stay there after a new
   * journey replaces the current one. */
  listCompleted(): Promise<Journey[]>;
  /** Forgets every journey, current and completed. */
  clear(): Promise<void>;
}

/**
 * Feedback on a completed journey (sprint 12): one per journey. `submit` is idempotent per journey —
 * a second submission returns the feedback already saved instead of creating a duplicate (a backend
 * would answer the same way to a retried request).
 */
export interface JourneyFeedbackRepository {
  getForJourney(journeyId: string): Promise<JourneyFeedback | null>;
  submit(input: JourneyFeedbackInput): Promise<JourneyFeedback>;
  /** Forgets every feedback (tests). */
  clear(): Promise<void>;
}

export type Repositories = {
  categories: CategoryRepository;
  places: PlaceRepository;
  experiences: ExperienceRepository;
  collections: CollectionRepository;
  auth: AuthRepository;
  users: UserRepository;
  search: SearchRepository;
  journeys: JourneyRepository;
  journeyFeedback: JourneyFeedbackRepository;
};
