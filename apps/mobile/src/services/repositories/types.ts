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

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = {
  /** The Register screen's first name. */
  displayName: string;
  email: string;
  password: string;
};

/**
 * The session (DATA-8). The repository owns how a session is kept on the device — a secure-store token
 * for the API, a persisted flag for the mock — so the auth context and screens never see a token.
 * Failures reject with an `ApiError` (API) — e.g. `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_ALREADY_EXISTS`,
 * `TOO_MANY_REQUESTS` — for the screen to show.
 */
export interface AuthRepository {
  /**
   * At startup: whether a session is kept on the device and still valid. A session the server refuses
   * (401) is forgotten and answers `false`; when the server cannot be reached the kept session is trusted
   * (`true`) — its next request will tell.
   */
  restoreSession(): Promise<boolean>;
  login(credentials: LoginCredentials): Promise<void>;
  /** Creates the account and opens its session (the Register screen lands signed in). */
  register(input: RegisterInput): Promise<void>;
  /** Always ends the local session, even when the server cannot be told (expired token, offline). */
  logout(): Promise<void>;
  /**
   * Notifies when the server refused the session during the app's life (401 on any request). The
   * session is already forgotten when the listener runs. Returns the unsubscribe function.
   */
  onSessionExpired(listener: () => void): () => void;
}

export interface UserRepository {
  /** The signed-in user's profile (API: `GET /auth/me`; mock: the same mocked profile). */
  getCurrentUser(): Promise<User>;
}

/**
 * The signed-in user's favorite experiences (API-10), prepared in DATA-8 but not used by a screen yet:
 * Home, Discover and "Mes favoris" still keep their local favorite state (`useFavoriteExperienceIds`,
 * `useFavoriteExperiences`). The source of truth is the list — there is no per-experience check.
 */
export interface FavoriteRepository {
  /** Ids of every favorite experience, most recently saved first. */
  listExperienceIds(): Promise<string[]>;
  /** Idempotent: saving a favorite twice keeps one. */
  add(experienceId: string): Promise<void>;
  /** Idempotent: removing what is not a favorite succeeds. */
  remove(experienceId: string): Promise<void>;
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
  favorites: FavoriteRepository;
  search: SearchRepository;
  journeys: JourneyRepository;
  journeyFeedback: JourneyFeedbackRepository;
};
