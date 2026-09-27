import { Injectable, Logger } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { MIGRATION_PROVIDER } from '../../database/catalog-seed/catalog-seed.js';
import type { Place, SourceInput } from '../catalog/catalog.types.js';
import { CategoryRepository } from '../catalog/category.repository.js';
import {
  PlaceRepository,
  type PlaceFacts,
  type PlaceUpsertOutcome,
} from '../catalog/place.repository.js';
import { matchPlace, normalizePlaceName, RNB_MAX_DISTANCE_M } from './place-matching.js';
import type {
  NearbyPlaceQuery,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from './provider.types.js';

export type IngestionOutcome = PlaceUpsertOutcome;
export type IngestedPlace = { place: Place; outcome: IngestionOutcome; rule?: string };
export type IngestionReport = {
  created: number;
  matched: number;
  updated: number;
  unchanged: number;
  places: Place[];
};

/**
 * Places no provider record may be merged into: the curated DATA-1 catalog (its facts are ROAM's, not a provider's).
 */
const PROTECTED_PROVIDERS: ReadonlySet<string> = new Set([MIGRATION_PROVIDER.key]);

/**
 * Provider places → the catalog (adapter → normalization → repositories). Provider-agnostic: it receives a
 * `PlaceProvider` and only sees normalized places.
 *
 * - **Identity**: a place is its provider record, `(provider key, external id)` in `ExternalSource` — never its
 *   name or address. The first import creates the place (or, DATA-6, attaches the record to the same place brought by
 *   another provider — place-matching.ts); every later one refreshes that place.
 * - **Ownership** (DATA-6): the place's primary source (the one that created it) owns its core facts; any source fills
 *   description, website, hours, attributes and RNB id only where the place has none. The ROAM enrichment, the
 *   categories of an existing place and other providers' sources are never written.
 * - **Obsolete**: a provider saying the place is closed marks its own record obsolete; the place is deactivated only
 *   when all its records are (never deleted).
 * - **Cost**: every call here is one provider request; freshness and TTLs are the sync's (src/modules/sync).
 */
@Injectable()
export class PlaceIngestionService {
  private readonly logger = new Logger('PlaceIngestionService');

  constructor(
    private readonly places: PlaceRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
  ) {}

  /** Searches the provider around a point and upserts every place found. */
  async importNearby(provider: PlaceProvider, query: NearbyPlaceQuery): Promise<IngestionReport> {
    const found = await provider.searchNearby(query);
    const report: IngestionReport = {
      created: 0,
      matched: 0,
      updated: 0,
      unchanged: 0,
      places: [],
    };
    const known = await this.knownCategories();
    for (const normalized of found) {
      const { place, outcome } = await this.upsert(provider.identity, normalized, known);
      report[outcome] += 1;
      report.places.push(place);
    }
    this.logger.log(
      `${provider.identity.key} importNearby: ${found.length} found, ${report.created} created, ` +
        `${report.matched} matched, ${report.updated} updated, ${report.unchanged} unchanged`,
    );
    return report;
  }

  /** Fetches one provider record and upserts it; `null` when the provider does not know it. */
  async importPlace(provider: PlaceProvider, externalId: string): Promise<IngestedPlace | null> {
    const normalized = await provider.getPlace(externalId);
    if (!normalized) return null;
    return this.upsert(provider.identity, normalized, await this.knownCategories());
  }

  /** Creates, matches or refreshes the place of this provider record (idempotent, concurrency-safe). */
  async upsert(
    provider: ProviderIdentity,
    normalized: NormalizedPlace,
    knownCategories?: ReadonlySet<string>,
  ): Promise<IngestedPlace> {
    const now = this.clock.now();
    const source: SourceInput = {
      provider: { key: provider.key, name: provider.name },
      externalId: normalized.source.externalId,
      externalUrl: normalized.source.externalUrl,
      providerCategories: normalized.source.providerCategories,
      fetchedAt: now,
      providerUpdatedAt: normalized.providerUpdatedAt ?? null,
      attribution: normalized.attribution ?? null,
      images: normalized.images,
      obsoleteAt: normalized.isActive ? null : now,
    };
    const facts: PlaceFacts = {
      name: normalized.name,
      address: normalized.address,
      city: normalized.city,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      priceLevel: normalized.priceLevel,
      rating: normalized.rating,
      reviewCount: normalized.reviewCount,
    };
    const known = knownCategories ?? (await this.knownCategories());
    const name = normalizePlaceName(normalized.name);

    return this.places.upsertFromSource({
      facts,
      fill: {
        description: normalized.description,
        website: normalized.website,
        openingHours: normalized.openingHours,
        attributes: normalized.attributes,
        rnbId: normalized.rnbId,
      },
      // Only categories the catalog has: a missing slug would fail the whole write.
      categorySlugs: normalized.categorySlugs.filter((slug) => known.has(slug)),
      source,
      match: {
        radiusMeters: RNB_MAX_DISTANCE_M,
        lockNames: name ? [name] : [],
        decide: (candidates) =>
          matchPlace(
            {
              providerKey: provider.key,
              name: normalized.name,
              latitude: normalized.latitude,
              longitude: normalized.longitude,
              rnbId: normalized.rnbId ?? null,
            },
            candidates,
            PROTECTED_PROVIDERS,
          ),
      },
    });
  }

  private async knownCategories(): Promise<ReadonlySet<string>> {
    return new Set((await this.categories.list()).map(({ slug }) => slug));
  }
}
