import type { JsonValue } from '../../database/json.js';
import type {
  Audience,
  EnergyLevel,
  EnrichmentSource,
  Moment,
  PriceLevel,
} from '../../generated/prisma/enums.js';

/**
 * The catalog as the domain sees it (EXPERIENCE.md, PLACE.md, EVENT.md): what the catalog repositories return
 * and accept — never a Prisma type. Categories are referred to by their stable slug.
 */

/** ROAM-owned context of a place or an experience (read-only here: enrichment is written by DATA-5). */
export type Enrichment = {
  atmosphere: string[];
  energyLevel: EnergyLevel;
  suitableFor: Audience[];
  bestMoments: Moment[];
  tags: string[];
  estimatedDurationMin: number | null;
  durationIsDerived: boolean;
  source: EnrichmentSource;
  confidence: JsonValue | null;
};

export type Place = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  photos: string[];
  openingHours: JsonValue | null;
  priceLevel: PriceLevel;
  rating: number | null;
  reviewCount: number | null;
  attributes: JsonValue | null;
  isActive: boolean;
  categorySlugs: string[];
  enrichment: Enrichment | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Experience = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImage: string | null;
  images: string[];
  startDate: Date | null;
  endDate: Date | null;
  openingHours: JsonValue | null;
  priceLevel: PriceLevel;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  popularity: number | null;
  isActive: boolean;
  categorySlugs: string[];
  /** The places the experience is made of, in order. */
  placeIds: string[];
  enrichment: Enrichment | null;
  createdAt: Date;
  updatedAt: Date;
};

/** An experience with its ordered places (detail screen, journey planning). */
export type ExperienceDetail = Experience & { places: Place[] };

export type Event = {
  id: string;
  experienceId: string | null;
  placeId: string | null;
  categorySlug: string | null;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  timezone: string | null;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  priceLevel: PriceLevel;
  bookingUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Provenance of a record imported from a provider (DATA_RULES.md "Provenance"). The provider is identified by
 * its adapter's stable key; it is registered on first use.
 */
export type SourceInput = {
  provider: { key: string; name: string };
  externalId: string;
  externalUrl?: string | null;
  providerCategories?: string[];
  confidence?: number | null;
  fetchedAt: Date;
  providerUpdatedAt?: Date | null;
};

type Writable<T, Required extends keyof T> = Pick<T, Required> &
  Partial<Omit<T, Required | 'id' | 'createdAt' | 'updatedAt' | 'enrichment'>>;

/** A normalized place (provider facts only: never an invented value — DATA_RULES.md). */
export type NewPlace = Writable<Omit<Place, 'categorySlugs'>, 'name' | 'latitude' | 'longitude'> & {
  categorySlugs?: string[];
  source?: SourceInput;
};

/** Changed provider facts; `undefined` leaves a field unchanged. Categories are not changed here. */
export type PlaceChange = Partial<Omit<NewPlace, 'categorySlugs' | 'source'>>;

export type NewExperience = Writable<Omit<Experience, 'categorySlugs' | 'placeIds'>, 'title'> & {
  categorySlugs?: string[];
  /** Ordered. */
  placeIds?: string[];
};

export type ExperienceChange = Partial<Omit<NewExperience, 'categorySlugs' | 'placeIds'>>;

export type NewEvent = Writable<Omit<Event, 'categorySlug'>, 'title' | 'startDate'> & {
  categorySlug?: string | null;
  source?: SourceInput;
};

export type EventChange = Partial<Omit<NewEvent, 'categorySlug' | 'source'>>;
