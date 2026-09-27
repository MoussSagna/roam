import { Injectable, Logger } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { UniqueConstraintError } from '../../database/persistence-errors.js';
import type { Event, EventChange, SourceInput } from '../catalog/catalog.types.js';
import { CategoryRepository } from '../catalog/category.repository.js';
import { EventRepository } from '../catalog/event.repository.js';
import { PlaceIngestionService } from './place-ingestion.service.js';
import type {
  EventProvider,
  NearbyEventQuery,
  NormalizedEvent,
  ProviderIdentity,
} from './provider.types.js';

export type EventIngestionOutcome = 'created' | 'updated';
export type IngestedEvent = { event: Event; outcome: EventIngestionOutcome };
export type EventIngestionReport = { created: number; updated: number; events: Event[] };

/**
 * Provider events → the catalog (adapter → normalization → repositories), the event counterpart of
 * `PlaceIngestionService`. Provider-agnostic: it receives an `EventProvider` and only sees normalized events.
 *
 * - **Venue**: the event's venue is a place from the same provider, upserted by `PlaceIngestionService` (same identity
 *   and ownership rules); the event is linked to it. An event without a locatable venue has no place.
 * - **Identity**: an event is its provider record, `(provider key, external id)` in `ExternalSource` — never its title
 *   or date. The first import creates the event with its provenance; every later one updates that event.
 * - **Ownership**: an update writes the provider facts (title, description, dates, timezone, images, prices, booking
 *   URL, active flag, venue) and refreshes the provenance. The ROAM category and the experience link are never
 *   overwritten by a refresh.
 * - **Cost**: every call here is one provider request; the cache/TTL decision belongs in front of it (DATA-6).
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
    const report: EventIngestionReport = { created: 0, updated: 0, events: [] };
    const known = await this.knownCategories();
    for (const normalized of found) {
      const { event, outcome } = await this.upsert(provider.identity, normalized, known);
      report[outcome] += 1;
      report.events.push(event);
    }
    this.logger.log(
      `${provider.identity.key} importNearby: ${found.length} found, ${report.created} created, ${report.updated} updated`,
    );
    return report;
  }

  /** Fetches one provider event and upserts it; `null` when the provider does not know it. */
  async importEvent(provider: EventProvider, externalId: string): Promise<IngestedEvent | null> {
    const normalized = await provider.getEvent(externalId);
    if (!normalized) return null;
    return this.upsert(provider.identity, normalized, await this.knownCategories());
  }

  /** Creates or updates the event of this provider record, and its venue (idempotent). */
  async upsert(
    provider: ProviderIdentity,
    normalized: NormalizedEvent,
    knownCategories?: ReadonlySet<string>,
  ): Promise<IngestedEvent> {
    const known = knownCategories ?? (await this.knownCategories());
    const venue = normalized.venue
      ? (await this.placeIngestion.upsert(provider, normalized.venue, known)).place
      : null;

    const source: SourceInput = {
      provider: { key: provider.key, name: provider.name },
      externalId: normalized.source.externalId,
      externalUrl: normalized.source.externalUrl,
      providerCategories: normalized.source.providerCategories,
      fetchedAt: this.clock.now(),
    };
    const facts: Omit<EventChange, 'experienceId'> = {
      title: normalized.title,
      description: normalized.description,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      timezone: normalized.timezone,
      images: normalized.images,
      priceMin: normalized.priceMin,
      priceMax: normalized.priceMax,
      currency: normalized.currency,
      priceLevel: normalized.priceLevel,
      bookingUrl: normalized.bookingUrl,
      isActive: normalized.isActive,
      // No locatable venue this time: the existing link is kept rather than dropped.
      placeId: venue ? venue.id : undefined,
    };

    const existing = await this.events.findBySource(provider.key, source.externalId);
    if (existing) return this.refresh(existing.id, facts, source);

    try {
      const event = await this.events.create({
        ...facts,
        title: normalized.title,
        startDate: normalized.startDate,
        placeId: venue?.id ?? null,
        // Only a category the catalog has: a missing slug would fail the whole write.
        categorySlug:
          normalized.categorySlug && known.has(normalized.categorySlug)
            ? normalized.categorySlug
            : null,
        source,
      });
      return { event, outcome: 'created' };
    } catch (error) {
      // A concurrent import created the same provider record first: update it instead.
      if (!(error instanceof UniqueConstraintError)) throw error;
      const raced = await this.events.findBySource(provider.key, source.externalId);
      if (!raced) throw error;
      return this.refresh(raced.id, facts, source);
    }
  }

  private async refresh(id: string, facts: Omit<EventChange, 'experienceId'>, source: SourceInput) {
    const event = await this.events.updateFromSource(id, facts, source);
    return { event, outcome: 'updated' as const };
  }

  private async knownCategories(): Promise<ReadonlySet<string>> {
    return new Set((await this.categories.list()).map(({ slug }) => slug));
  }
}
