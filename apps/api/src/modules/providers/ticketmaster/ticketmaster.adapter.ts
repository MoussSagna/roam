import { Injectable } from '@nestjs/common';

import { Clock } from '../../../common/clock.js';
import { ProviderNotFoundError } from '../provider.errors.js';
import type {
  EventProvider,
  NearbyEventQuery,
  NormalizedEvent,
  ProviderIdentity,
} from '../provider.types.js';
import { geohash } from './geohash.js';
import { TICKETMASTER_PROVIDER, TicketmasterClient } from './ticketmaster.client.js';
import { mapTicketmasterEventToRoamEvent, segmentIdsForCategories } from './ticketmaster.mapper.js';

/**
 * Event Search limits. Ticketmaster: `size` < 200 and `size × page` < 1000. ROAM keeps one page of at most 50 events
 * (Ticketmaster's recommended maximum) and the 50 km radius of the place providers; no automatic paging.
 */
export const TICKETMASTER_SEARCH_LIMITS = {
  maxRadiusMeters: 50_000,
  maxResults: 50,
  defaultResults: 20,
} as const;

/**
 * Ticketmaster behind the event-provider contract: translates a ROAM query into an Event Search, and Ticketmaster
 * events into normalized ROAM events. Provider errors pass through typed (provider.errors.ts); an unknown event is
 * `null`.
 */
@Injectable()
export class TicketmasterAdapter implements EventProvider {
  readonly identity: ProviderIdentity = TICKETMASTER_PROVIDER;

  constructor(
    private readonly client: TicketmasterClient,
    private readonly clock: Clock,
  ) {}

  async searchNearby(query: NearbyEventQuery): Promise<NormalizedEvent[]> {
    const { latitude, longitude, radiusMeters } = query;
    const maxResults = query.maxResults ?? TICKETMASTER_SEARCH_LIMITS.defaultResults;
    const from = query.from ?? this.clock.now();
    if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180))
      throw new RangeError('searchNearby: invalid coordinates');
    if (!(radiusMeters > 0 && radiusMeters <= TICKETMASTER_SEARCH_LIMITS.maxRadiusMeters))
      throw new RangeError(
        `searchNearby: radius must be in (0, ${TICKETMASTER_SEARCH_LIMITS.maxRadiusMeters}] m`,
      );
    if (
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > TICKETMASTER_SEARCH_LIMITS.maxResults
    )
      throw new RangeError(
        `searchNearby: maxResults must be 1–${TICKETMASTER_SEARCH_LIMITS.maxResults}`,
      );
    if (Number.isNaN(from.getTime()) || (query.to && !(query.to.getTime() > from.getTime())))
      throw new RangeError('searchNearby: invalid date range');

    let segmentIds: string[] | undefined;
    if (query.categorySlugs?.length) {
      segmentIds = segmentIdsForCategories(query.categorySlugs);
      // Categories Ticketmaster cannot express: an unfiltered search would return unrelated events.
      if (segmentIds.length === 0) return [];
    }

    const radiusKm = radiusMeters / 1000;
    const events = await this.client.searchEvents({
      geoPoint: geohash(latitude, longitude),
      // Ticketmaster takes whole kilometres: ask for the enclosing circle, then keep what is really inside.
      radiusKm: Math.ceil(radiusKm),
      startDateTime: from,
      endDateTime: query.to,
      size: maxResults,
      segmentIds,
    });
    return events
      .filter((event) => event.distanceKm !== undefined && event.distanceKm <= radiusKm)
      .map(mapTicketmasterEventToRoamEvent);
  }

  async getEvent(externalId: string): Promise<NormalizedEvent | null> {
    try {
      return mapTicketmasterEventToRoamEvent(await this.client.getEvent(externalId));
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return null;
      throw error;
    }
  }
}
