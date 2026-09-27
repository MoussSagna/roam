import { Injectable } from '@nestjs/common';

import { Clock } from '../../../common/clock.js';
import { instantToLocal } from '../event-timing.js';
import { ProviderNotFoundError } from '../provider.errors.js';
import type {
  EventProvider,
  NearbyEventQuery,
  NearbyPlaceQuery,
  NormalizedEvent,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from '../provider.types.js';
import {
  DATATOURISME_MAX_PAGE_SIZE,
  DATATOURISME_PROVIDER,
  DatatourismeClient,
} from './datatourisme.client.js';
import { mapDatatourismeEvent, mapDatatourismePlace } from './datatourisme.mapper.js';

/** Search limits: one page of at most 100 (the API maximum), the 50 km radius of the other providers. */
export const DATATOURISME_SEARCH_LIMITS = {
  maxRadiusMeters: 50_000,
  maxResults: DATATOURISME_MAX_PAGE_SIZE,
  defaultResults: 20,
} as const;

function checkQuery(
  query: { latitude: number; longitude: number; radiusMeters: number },
  max: number,
) {
  const { latitude, longitude, radiusMeters } = query;
  if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180))
    throw new RangeError('searchNearby: invalid coordinates');
  if (!(radiusMeters > 0 && radiusMeters <= DATATOURISME_SEARCH_LIMITS.maxRadiusMeters))
    throw new RangeError(
      `searchNearby: radius must be in (0, ${DATATOURISME_SEARCH_LIMITS.maxRadiusMeters}] m`,
    );
  if (!Number.isInteger(max) || max < 1 || max > DATATOURISME_SEARCH_LIMITS.maxResults)
    throw new RangeError(
      `searchNearby: maxResults must be 1–${DATATOURISME_SEARCH_LIMITS.maxResults}`,
    );
}

/** Today's calendar date in Paris (DATAtourisme events are compared in local days). */
export function parisToday(now: Date): string {
  return instantToLocal(now, 'Europe/Paris').date;
}

/**
 * DATAtourisme places behind the place-provider contract. ROAM categories are filtered after the search (the API's
 * `type` takes one class); a record the API returns without a name or coordinates is dropped by the DTO validation.
 */
@Injectable()
export class DatatourismePlaceAdapter implements PlaceProvider {
  readonly identity: ProviderIdentity = DATATOURISME_PROVIDER;

  constructor(private readonly client: DatatourismeClient) {}

  async searchNearby(query: NearbyPlaceQuery): Promise<NormalizedPlace[]> {
    const max = query.maxResults ?? DATATOURISME_SEARCH_LIMITS.defaultResults;
    checkQuery(query, max);
    const page = await this.client.listPage(
      { endpoint: 'placeOfInterest', near: query, pageSize: max },
      null,
    );
    const places = page.pois.map(mapDatatourismePlace);
    const wanted = query.categorySlugs;
    return wanted?.length
      ? places.filter((place) => place.categorySlugs.some((slug) => wanted.includes(slug)))
      : places;
  }

  async getPlace(externalId: string): Promise<NormalizedPlace | null> {
    try {
      const parsed = await this.client.getPoi(externalId);
      return 'poi' in parsed ? mapDatatourismePlace(parsed.poi) : null;
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return null;
      throw error;
    }
  }
}

/** DATAtourisme events behind the event-provider contract (local dates; see datatourisme.mapper.ts). */
@Injectable()
export class DatatourismeEventAdapter implements EventProvider {
  readonly identity: ProviderIdentity = DATATOURISME_PROVIDER;

  constructor(
    private readonly client: DatatourismeClient,
    private readonly clock: Clock,
  ) {}

  async searchNearby(query: NearbyEventQuery): Promise<NormalizedEvent[]> {
    const max = query.maxResults ?? DATATOURISME_SEARCH_LIMITS.defaultResults;
    checkQuery(query, max);
    const today = parisToday(query.from ?? this.clock.now());
    const page = await this.client.listPage(
      { endpoint: 'entertainmentAndEvent', near: query, pageSize: max, start: today },
      null,
    );
    const events: NormalizedEvent[] = [];
    for (const poi of page.pois) {
      const mapped = mapDatatourismeEvent(poi, today);
      if ('event' in mapped) events.push(mapped.event);
    }
    const wanted = query.categorySlugs;
    return wanted?.length
      ? events.filter((event) => event.categorySlug && wanted.includes(event.categorySlug))
      : events;
  }

  async getEvent(externalId: string): Promise<NormalizedEvent | null> {
    try {
      const parsed = await this.client.getPoi(externalId);
      if (!('poi' in parsed)) return null;
      const mapped = mapDatatourismeEvent(parsed.poi, parisToday(this.clock.now()));
      return 'event' in mapped ? mapped.event : null;
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return null;
      throw error;
    }
  }
}
