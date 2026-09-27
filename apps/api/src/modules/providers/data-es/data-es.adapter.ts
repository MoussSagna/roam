import { Injectable } from '@nestjs/common';

import type {
  NearbyPlaceQuery,
  NormalizedPlace,
  PlaceProvider,
  ProviderIdentity,
} from '../provider.types.js';
import {
  DATA_ES_PAGE_SIZE,
  DATA_ES_PROVIDER,
  DataEsClient,
  type DataEsRecord,
} from './data-es.client.js';
import { groupByInstallation, INSTALLATION_ID, mapDataEsInstallation } from './data-es.mapper.js';

export const DATA_ES_SEARCH_LIMITS = {
  maxRadiusMeters: 50_000,
  maxResults: 50,
  defaultResults: 20,
} as const;
/** An installation rarely has more than a few dozen equipments; this bounds one search. */
const MAX_PAGES_PER_SEARCH = 5;

/** ODSQL circle filter; numbers only (validated), never user text. */
export function withinDistanceWhere(latitude: number, longitude: number, radiusMeters: number) {
  return `within_distance(equip_coordonnees, geom'POINT(${longitude} ${latitude})', ${Math.round(radiusMeters)}m)`;
}

/**
 * Data ES behind the place-provider contract: installations (not equipments) as places. ROAM categories cannot filter
 * it (no sports category): a query with categories returns nothing, like the other adapters for unmapped categories.
 */
@Injectable()
export class DataEsAdapter implements PlaceProvider {
  readonly identity: ProviderIdentity = DATA_ES_PROVIDER;

  constructor(private readonly client: DataEsClient) {}

  async searchNearby(query: NearbyPlaceQuery): Promise<NormalizedPlace[]> {
    const { latitude, longitude, radiusMeters } = query;
    const max = query.maxResults ?? DATA_ES_SEARCH_LIMITS.defaultResults;
    if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180))
      throw new RangeError('searchNearby: invalid coordinates');
    if (!(radiusMeters > 0 && radiusMeters <= DATA_ES_SEARCH_LIMITS.maxRadiusMeters))
      throw new RangeError(
        `searchNearby: radius must be in (0, ${DATA_ES_SEARCH_LIMITS.maxRadiusMeters}] m`,
      );
    if (!Number.isInteger(max) || max < 1 || max > DATA_ES_SEARCH_LIMITS.maxResults)
      throw new RangeError(
        `searchNearby: maxResults must be 1–${DATA_ES_SEARCH_LIMITS.maxResults}`,
      );
    if (query.categorySlugs?.length) return [];

    const where = withinDistanceWhere(latitude, longitude, radiusMeters);
    const places: NormalizedPlace[] = [];
    let carry: DataEsRecord[] = [];
    for (let page = 0, offset = 0; page < MAX_PAGES_PER_SEARCH && places.length < max; page += 1) {
      const { records, total } = await this.client.page(where, offset);
      offset += records.length;
      const last = records.length < DATA_ES_PAGE_SIZE || offset >= total;
      const { complete, pending } = groupByInstallation([...carry, ...records], last);
      carry = pending;
      for (const group of complete) {
        const mapped = mapDataEsInstallation(group);
        if ('place' in mapped) places.push(mapped.place);
      }
      if (last) break;
    }
    return places.slice(0, max);
  }

  async getPlace(externalId: string): Promise<NormalizedPlace | null> {
    if (!INSTALLATION_ID.test(externalId)) return null;
    const { records } = await this.client.page(`inst_numero = "${externalId}"`, 0);
    if (records.length === 0) return null;
    const mapped = mapDataEsInstallation(records);
    return 'place' in mapped ? mapped.place : null;
  }
}
