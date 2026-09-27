import type { PriceLevel } from '../../generated/prisma/enums.js';

/**
 * The provider contract (PROVIDER_ARCHITECTURE.md): what ROAM expects from any place source (Google Places,
 * Geoapify) or event source (Ticketmaster). ROAM code depends on these types only — never on a provider's own types,
 * payloads or constants.
 */

/** Identity of a provider: `key` is the stable `Provider.key` recorded in the provenance. */
export type ProviderIdentity = { key: string; name: string };

/** A place search around a point. Categories are ROAM slugs; each adapter translates them. */
export type NearbyPlaceQuery = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** At most this many places (each provider has its own ceiling). */
  maxResults?: number;
  categorySlugs?: string[];
};

/**
 * A provider place normalized into ROAM's vocabulary — provider facts only (DATA_RULES.md): no atmosphere, energy,
 * audience, moments, duration or score, which belong to the ROAM enrichment. Missing facts stay `null`/`UNKNOWN`.
 */
export type NormalizedPlace = {
  /** Provenance: the provider's stable id of the place and its own classification, kept as received. */
  source: {
    providerKey: string;
    externalId: string;
    externalUrl: string | null;
    providerCategories: string[];
  };
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  priceLevel: PriceLevel;
  rating: number | null;
  reviewCount: number | null;
  /** False when the provider says the place closed permanently. */
  isActive: boolean;
  /** ROAM category slugs derived from the provider classification by an explicit table. */
  categorySlugs: string[];
};

/** A source of places. Implementations call their provider, validate, and normalize. */
export interface PlaceProvider {
  readonly identity: ProviderIdentity;
  searchNearby(query: NearbyPlaceQuery): Promise<NormalizedPlace[]>;
  /** The place with this provider id, `null` when the provider does not know it. */
  getPlace(externalId: string): Promise<NormalizedPlace | null>;
}

/** An event search around a point (DATA-4). Categories are ROAM slugs; each adapter translates them. */
export type NearbyEventQuery = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** Events starting at or after this instant (default: now — past events are not searched). */
  from?: Date;
  /** Events starting before this instant. */
  to?: Date;
  /** At most this many events (each provider has its own ceiling). */
  maxResults?: number;
  categorySlugs?: string[];
};

/**
 * A provider event normalized into ROAM's vocabulary — provider facts only (EVENT.md, DATA_RULES.md): never an
 * invented end time, price or description. Instants are absolute (`Date`, stored as `timestamptz`); `timezone` is the
 * event's IANA zone when the provider gives it, for display only.
 */
export type NormalizedEvent = {
  source: {
    providerKey: string;
    externalId: string;
    externalUrl: string | null;
    providerCategories: string[];
  };
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
  /** False when the provider says the event was cancelled. */
  isActive: boolean;
  /** ROAM category slug derived from the provider classification by an explicit table, if any. */
  categorySlug: string | null;
  /** The venue as a place (same contract as place providers), `null` when unknown or not locatable. */
  venue: NormalizedPlace | null;
};

/** A source of events. Implementations call their provider, validate, and normalize. */
export interface EventProvider {
  readonly identity: ProviderIdentity;
  searchNearby(query: NearbyEventQuery): Promise<NormalizedEvent[]>;
  /** The event with this provider id, `null` when the provider does not know it. */
  getEvent(externalId: string): Promise<NormalizedEvent | null>;
}
