/**
 * The ROAM API's response bodies, as the mobile app reads them (the `data` of each envelope). Transcribed
 * from the API contracts — `apps/api/apidocs/AUTHENTICATION.md`, `EXPERIENCE_CATALOG_API.md`,
 * `FAVORITES_API.md` — not imported from `apps/api` (a different runtime and build). They stay private
 * to `services/api/`: adapters turn them into the app's own types before anything else sees them.
 *
 * Only the fields the app reads are listed; the API may send more.
 */

export type PageDto<T> = {
  items: T[];
  nextCursor: string | null;
};

export type UserDto = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
};

export type SessionDto = {
  token: string;
  expiresAt: string;
};

/** `POST /auth/login`, `POST /auth/register`. */
export type AuthResultDto = {
  user: UserDto;
  session: SessionDto;
};

export type CoordinatesDto = {
  latitude: number;
  longitude: number;
};

/** ROAM-derived context of an experience (never a provider fact). `null` = not enriched yet. */
export type RoamContextDto = {
  atmosphere: string[];
  energyLevel: string;
  suitableFor: string[];
  bestMoments: string[];
  tags: string[];
  estimatedDurationMin: number | null;
  durationIsDerived: boolean;
  source: string;
};

/** `GET /experiences` items, and the base of the detail. */
export type ExperienceDto = {
  id: string;
  title: string;
  description: string | null;
  /** Category slugs. */
  categories: string[];
  city: string | null;
  address: string | null;
  coordinates: CoordinatesDto | null;
  /** Image URL, or `null` (every experience today: DATA-1 did not migrate the bundled photos). */
  coverImage: string | null;
  images: string[];
  priceLevel: string;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  placeIds: string[];
  isActive: boolean;
  roam: RoamContextDto | null;
};

/** `GET /favorites` items. */
export type FavoriteDto = {
  id: string;
  experienceId: string;
  createdAt: string;
  experience: ExperienceDto;
};

/** `GET /recommendations` (EXPERIENCE_CATALOG_API.md → "Recommendations"). */
export type RecommendationsDto = {
  items: {
    experience: ExperienceDto;
    /** Straight line, when known. */
    distanceM: number | null;
    reasons: ('nearby' | 'budget' | 'duration' | 'company')[];
  }[];
  /** The constraints dropped to find alternatives; empty for a perfect match. */
  relaxed: ('budget' | 'distance' | 'duration' | 'company')[];
};
