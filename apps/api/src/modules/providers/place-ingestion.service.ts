import { Injectable, Logger } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { UniqueConstraintError } from '../../database/persistence-errors.js';
import type { Place, PlaceChange, SourceInput } from '../catalog/catalog.types.js';
import { CategoryRepository } from '../catalog/category.repository.js';
import { PlaceRepository } from '../catalog/place.repository.js';
import type {
  NearbyPlaceQuery,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from './provider.types.js';

export type IngestionOutcome = 'created' | 'updated';
export type IngestedPlace = { place: Place; outcome: IngestionOutcome };
export type IngestionReport = { created: number; updated: number; places: Place[] };

/**
 * Provider places → the catalog (adapter → normalization → repositories). Provider-agnostic: it receives a
 * `PlaceProvider` and only sees normalized places.
 *
 * - **Identity**: a place is its provider record, `(provider key, external id)` in `ExternalSource` — never its
 *   name or address. The first import creates the place with its provenance; every later one updates that place.
 * - **Ownership**: an update writes provider facts and refreshes the provenance only. The ROAM enrichment
 *   (atmosphere, energy, audience, moments, duration, tags), the categories, the description, photos, hours and
 *   attributes are never overwritten by a refresh.
 * - **Cost**: every call here is one provider request. The cache/TTL decision ("is this record fresh enough?",
 *   from `ExternalSource.fetchedAt`) belongs in front of these methods (DATA-6), not in the adapter.
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
    const report: IngestionReport = { created: 0, updated: 0, places: [] };
    const known = await this.knownCategories();
    for (const normalized of found) {
      const { place, outcome } = await this.upsert(provider.identity, normalized, known);
      report[outcome] += 1;
      report.places.push(place);
    }
    this.logger.log(
      `${provider.identity.key} importNearby: ${found.length} found, ${report.created} created, ${report.updated} updated`,
    );
    return report;
  }

  /** Fetches one provider record and upserts it; `null` when the provider does not know it. */
  async importPlace(provider: PlaceProvider, externalId: string): Promise<IngestedPlace | null> {
    const normalized = await provider.getPlace(externalId);
    if (!normalized) return null;
    return this.upsert(provider.identity, normalized, await this.knownCategories());
  }

  /** Creates or updates the place of this provider record (idempotent). */
  async upsert(
    provider: ProviderIdentity,
    normalized: NormalizedPlace,
    knownCategories?: ReadonlySet<string>,
  ): Promise<IngestedPlace> {
    const source: SourceInput = {
      provider: { key: provider.key, name: provider.name },
      externalId: normalized.source.externalId,
      externalUrl: normalized.source.externalUrl,
      providerCategories: normalized.source.providerCategories,
      fetchedAt: this.clock.now(),
    };
    const facts: PlaceChange = {
      name: normalized.name,
      address: normalized.address,
      city: normalized.city,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      priceLevel: normalized.priceLevel,
      rating: normalized.rating,
      reviewCount: normalized.reviewCount,
      isActive: normalized.isActive,
    };

    const existing = await this.places.findBySource(provider.key, source.externalId);
    if (existing) return this.refresh(existing.id, facts, source);

    const known = knownCategories ?? (await this.knownCategories());
    try {
      const place = await this.places.create({
        ...facts,
        name: normalized.name,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        // Only categories the catalog has: a missing slug would fail the whole write.
        categorySlugs: normalized.categorySlugs.filter((slug) => known.has(slug)),
        source,
      });
      return { place, outcome: 'created' };
    } catch (error) {
      // A concurrent import created the same provider record first: update it instead.
      if (!(error instanceof UniqueConstraintError)) throw error;
      const raced = await this.places.findBySource(provider.key, source.externalId);
      if (!raced) throw error;
      return this.refresh(raced.id, facts, source);
    }
  }

  private async refresh(id: string, facts: PlaceChange, source: SourceInput) {
    const place = await this.places.updateFromSource(id, facts, source);
    return { place, outcome: 'updated' as const };
  }

  private async knownCategories(): Promise<ReadonlySet<string>> {
    return new Set((await this.categories.list()).map(({ slug }) => slug));
  }
}
