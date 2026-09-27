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

/** ROAM-owned context of a place or an experience (a place's is written by `RoamEnrichmentRepository`, DATA-3). */
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
  /** The place's own website (DATA-6). */
  website: string | null;
  /** RNB building id (DATA-6): a deduplication signal, never an identity. */
  rnbId: string | null;
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
  /** Absolute start instant — only when the source gives a time and its zone; `null` for a date-only event. */
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  /** Local calendar dates ("YYYY-MM-DD") and wall-clock times ("HH:MM"), as the source gives them (DATA-6). */
  localStartDate: string | null;
  localStartTime: string | null;
  localEndDate: string | null;
  localEndTime: string | null;
  /** The event's own location when it has no venue place (DATA-6). */
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
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
  /** Who to credit for this record (e.g. the DATAtourisme producer) — DATA-6. */
  attribution?: string | null;
  /** This record's images with their rights — DATA-6. `undefined` leaves them unchanged. */
  images?: SourceImage[];
  /** Set when the provider explicitly declares the record obsolete or closed; `null` when it is live. */
  obsoleteAt?: Date | null;
};

/**
 * An image as a provider gives it, with its rights (DATA_PERSISTENCE_AND_SYNC.md "Images and licensing"). The provider
 * and external id are those of the `ExternalSource` holding it. `license` null = unknown: not usable commercially by
 * default (`imageUsage`).
 */
export type SourceImage = {
  url: string;
  license: string | null;
  credit: string | null;
  /** "YYYY-MM-DD", inclusive. */
  rightsStartDate: string | null;
  rightsEndDate: string | null;
};

/** The provenance of a catalog record, as stored (one per provider record). */
export type Source = {
  providerKey: string;
  providerName: string;
  externalId: string;
  externalUrl: string | null;
  providerCategories: string[];
  fetchedAt: Date;
  providerUpdatedAt: Date | null;
  attribution: string | null;
  images: SourceImage[];
  obsoleteAt: Date | null;
  createdAt: Date;
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
