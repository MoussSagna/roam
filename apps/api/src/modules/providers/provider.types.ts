import type { PriceLevel } from '../../generated/prisma/enums.js';

/**
 * The provider contract (PROVIDER_ARCHITECTURE.md): what ROAM expects from any place source (Google Places now,
 * others later). ROAM code depends on these types only — never on a provider's own types, payloads or constants.
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
