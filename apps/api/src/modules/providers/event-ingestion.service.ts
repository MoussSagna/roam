import { Injectable, Logger } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import type { Event, SourceInput } from '../catalog/catalog.types.js';
import { CategoryRepository } from '../catalog/category.repository.js';
import { EventRepository, type EventUpsertOutcome } from '../catalog/event.repository.js';
import { resolveEventTiming } from './event-timing.js';
import { PlaceIngestionService } from './place-ingestion.service.js';
import type {
  EventProvider,
  NearbyEventQuery,
  NormalizedEvent,
  ProviderIdentity,
} from './provider.types.js';

export type EventIngestionOutcome = EventUpsertOutcome;
export type IngestedEvent = { event: Event; outcome: EventIngestionOutcome };
export type EventIngestionReport = {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  events: Event[];
};

/** A provider record that cannot be stored as is (e.g. no start, an end before its start): skipped, not failed. */
export class InvalidProviderRecordError extends Error {
  constructor(readonly reason: string) {
    super(`invalid provider record: ${reason}`);
    this.name = 'InvalidProviderRecordError';
  }
}

/**
 * Provider events → the catalog (adapter → normalization → repositories), the event counterpart of
 * `PlaceIngestionService`. Provider-agnostic: it receives an `EventProvider` and only sees normalized events.
 *
 * - **Venue**: the event's venue is a place from the same provider, upserted by `PlaceIngestionService` (same identity
 *   and ownership rules); the event is linked to it. A provider giving only an inline location (DATAtourisme) fills the
 *   event's own `address`/`city`/`latitude`/`longitude` (DATA-6) — no invented venue place.
 * - **Timing** (DATA-6): instants, local dates and times completed by `resolveEventTiming` — never an invented time.
 * - **Identity**: an event is its provider record, `(provider key, external id)` in `ExternalSource` — never its title
 *   or date. No cross-provider event merge.
 * - **Ownership**: an update writes the provider facts and refreshes the provenance. The ROAM category and the
 *   experience link are never overwritten by a refresh.
 */
@Injectable()
export class EventIngestionService {
  private readonly logger = new Logger('EventIngestionService');

  constructor(
    private readonly events: EventRepository,
    private readonly categories: CategoryRepository,
    private readonly placeIngestion: PlaceIngestionService,
    private readonly clock: Clock,
  ) {}

  /** Searches the provider around a point and upserts every event found (and its venue). */
  async importNearby(
    provider: EventProvider,
    query: NearbyEventQuery,
  ): Promise<EventIngestionReport> {
    const found = await provider.searchNearby(query);
    const report: EventIngestionReport = {
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      events: [],
    };
    const known = await this.knownCategories();
    for (const normalized of found) {
      try {
        const { event, outcome } = await this.upsert(provider.identity, normalized, known);
        report[outcome] += 1;
        report.events.push(event);
      } catch (error) {
        if (!(error instanceof InvalidProviderRecordError)) throw error;
        report.skipped += 1;
      }
    }
    this.logger.log(
      `${provider.identity.key} importNearby: ${found.length} found, ${report.created} created, ` +
        `${report.updated} updated, ${report.unchanged} unchanged, ${report.skipped} skipped`,
    );
    return report;
  }

  /** Fetches one provider event and upserts it; `null` when the provider does not know it. */
  async importEvent(provider: EventProvider, externalId: string): Promise<IngestedEvent | null> {
    const normalized = await provider.getEvent(externalId);
    if (!normalized) return null;
    return this.upsert(provider.identity, normalized, await this.knownCategories());
  }

  /**
   * Creates or updates the event of this provider record, and its venue (idempotent, concurrency-safe). Throws
   * `InvalidProviderRecordError` for an event whose timing cannot be stored without inventing anything.
   */
  async upsert(
    provider: ProviderIdentity,
    normalized: NormalizedEvent,
    knownCategories?: ReadonlySet<string>,
  ): Promise<IngestedEvent> {
    let timing;
    try {
      timing = resolveEventTiming(normalized);
    } catch (error) {
      throw new InvalidProviderRecordError((error as Error).message);
    }

    const known = knownCategories ?? (await this.knownCategories());
    const venue = normalized.venue
      ? (await this.placeIngestion.upsert(provider, normalized.venue, known)).place
      : null;

    const now = this.clock.now();
    const source: SourceInput = {
      provider: { key: provider.key, name: provider.name },
      externalId: normalized.source.externalId,
      externalUrl: normalized.source.externalUrl,
      providerCategories: normalized.source.providerCategories,
      fetchedAt: now,
      providerUpdatedAt: normalized.providerUpdatedAt ?? null,
      attribution: normalized.attribution ?? null,
      images: normalized.sourceImages,
      obsoleteAt: normalized.isActive ? null : now,
    };
    const location = normalized.location ?? null;
    const { event, outcome } = await this.events.upsertFromSource({
      facts: {
        title: normalized.title,
        description: normalized.description,
        ...timing,
        address: location?.address ?? null,
        city: location?.city ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        images: normalized.images,
        priceMin: normalized.priceMin,
        priceMax: normalized.priceMax,
        currency: normalized.currency,
        priceLevel: normalized.priceLevel,
        bookingUrl: normalized.bookingUrl,
        isActive: normalized.isActive,
      },
      // No locatable venue this time: the existing link is kept rather than dropped.
      placeId: venue?.id,
      // Only a category the catalog has: a missing slug would fail the whole write.
      categorySlug:
        normalized.categorySlug && known.has(normalized.categorySlug)
          ? normalized.categorySlug
          : null,
      source,
    });
    return { event, outcome };
  }

  private async knownCategories(): Promise<ReadonlySet<string>> {
    return new Set((await this.categories.list()).map(({ slug }) => slug));
  }
}
