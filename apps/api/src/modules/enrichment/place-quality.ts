import type { Place } from '../catalog/catalog.types.js';

/**
 * Minimal quality of a catalog place (ROAM_ENRICHMENT.md "Quality"). Computed, never stored: the schema has no quality
 * status, and none is added.
 *
 * - **Blocking issues** make a place not recommendation-ready: it cannot be placed on a map, named, classified or
 *   offered. Identity and provenance are guaranteed earlier (adapters drop records without an id, a name or valid
 *   coordinates; ingestion always writes the `ExternalSource`).
 * - **Missing facts** are information only: a provider that does not give a rating or a price is normal (Geoapify
 *   gives neither). They are reported, never filled in.
 */
export type PlaceQualityIssue = 'MISSING_NAME' | 'INVALID_COORDINATES' | 'NO_CATEGORY' | 'INACTIVE';

export type MissingFact = 'address' | 'city' | 'priceLevel' | 'rating' | 'reviewCount';

export type PlaceQuality = {
  recommendationReady: boolean;
  issues: PlaceQualityIssue[];
  missingFacts: MissingFact[];
  /** Whether the place has a ROAM enrichment (rules or curated). Not a blocking issue: unknown context never excludes. */
  enriched: boolean;
};

export function assessPlaceQuality(place: Place): PlaceQuality {
  const issues: PlaceQualityIssue[] = [];
  if (place.name.trim() === '') issues.push('MISSING_NAME');
  if (
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude) ||
    Math.abs(place.latitude) > 90 ||
    Math.abs(place.longitude) > 180
  )
    issues.push('INVALID_COORDINATES');
  if (place.categorySlugs.length === 0) issues.push('NO_CATEGORY');
  if (!place.isActive) issues.push('INACTIVE');

  const missingFacts: MissingFact[] = [];
  if (!place.address) missingFacts.push('address');
  if (!place.city) missingFacts.push('city');
  if (place.priceLevel === 'UNKNOWN') missingFacts.push('priceLevel');
  if (place.rating === null) missingFacts.push('rating');
  if (place.reviewCount === null) missingFacts.push('reviewCount');

  return {
    recommendationReady: issues.length === 0,
    issues,
    missingFacts,
    enriched: place.enrichment !== null,
  };
}
