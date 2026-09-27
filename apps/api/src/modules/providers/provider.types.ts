import type { JsonValue } from '../../database/json.js';
import type { PriceLevel } from '../../generated/prisma/enums.js';
import type { SourceImage } from '../catalog/catalog.types.js';

export type { SourceImage };

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

  // DATA-6 — optional, provider-neutral facts. Written only where the place has none yet (never over curated data or
  // another provider's value); absent = the provider does not give it.
  description?: string | null;
  /** The place's own website (not the provider's page). */
  website?: string | null;
  openingHours?: OpeningHours | null;
  /** Selected facts that fit no column (e.g. free access to a sports place), provider-neutral keys. */
  attributes?: { [key: string]: JsonValue } | null;
  /** RNB building id — a deduplication signal. */
  rnbId?: string | null;
  /** Images with their rights, kept on this provider record (`ExternalSource.images`). */
  images?: SourceImage[];
  /** Who to credit for this record (licence obligation, e.g. the DATAtourisme producer). */
  attribution?: string | null;
  /** When the provider last updated the record, if it says. */
  providerUpdatedAt?: Date | null;
};

/**
 * Opening hours in a provider-neutral shape (DATA-6): weekly periods in local time. Stored as JSON in `Place.openingHours`.
 * `days` use English day names (Monday…Sunday); `opens`/`closes` are "HH:MM"; `validFrom`/`validThrough` are calendar
 * dates when the period is seasonal; `note` is the provider's free text when it gives one.
 */
export type OpeningHours = {
  periods: {
    days: string[];
    opens: string | null;
    closes: string | null;
    validFrom: string | null;
    validThrough: string | null;
  }[];
  note: string | null;
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
 * invented time, end, price or description. Instants are absolute (`Date`, stored as `timestamptz`); `timezone` is the
 * event's IANA zone when known.
 *
 * Timing (DATA-6): `startDate` is an instant only when the provider gives a time and its zone (Ticketmaster). A provider
 * giving local dates (DATAtourisme) sets `localStartDate` (+ `localStartTime` when known) and `startDate: null`; the
 * ingestion derives the instant only when the time and zone are both known (event-timing.ts). At least one of
 * `startDate` / `localStartDate` is set.
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
  startDate: Date | null;
  endDate: Date | null;
  timezone: string | null;
  /** "YYYY-MM-DD" / "HH:MM", local (DATA-6). */
  localStartDate?: string | null;
  localStartTime?: string | null;
  localEndDate?: string | null;
  localEndTime?: string | null;
  /** The event's own location when it has no venue record (DATA-6). */
  location?: {
    address: string | null;
    city: string | null;
    latitude: number;
    longitude: number;
  } | null;
  attribution?: string | null;
  providerUpdatedAt?: Date | null;
  /** Images with their rights, kept on this provider record (`ExternalSource.images`) — not in `images`. */
  sourceImages?: SourceImage[];
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
