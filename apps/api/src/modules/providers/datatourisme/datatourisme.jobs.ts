import type { EventSyncJob, PlaceSyncJob, SyncBatch, SyncReader } from '../../sync/sync.types.js';
import { instantToLocal } from '../event-timing.js';
import type { NormalizedEvent, NormalizedPlace } from '../provider.types.js';
import { parisToday } from './datatourisme.adapter.js';
import {
  DATATOURISME_MAX_PAGE_SIZE,
  DATATOURISME_PROVIDER,
  type DatatourismeClient,
  type DatatourismeEndpoint,
  type DatatourismeListRequest,
} from './datatourisme.client.js';
import type { DatatourismePoiDto } from './datatourisme.dto.js';
import { mapDatatourismeEvent, mapDatatourismePlace } from './datatourisme.mapper.js';

export type DatatourismeScope = {
  /** Job name part, e.g. "paris". */
  name: string;
  near: { latitude: number; longitude: number; radiusMeters: number };
};

/**
 * Paged DATAtourisme reads for the sync (DATA_PERSISTENCE_AND_SYNC.md "Pagination"): pages of 100 following the API's
 * `next` links — the only way past 10 000 results — each link validated and stripped of any key
 * (`sanitizeNextLink`); the cursor saved between batches is that sanitized relative path. Incremental: after a
 * successful run, only records updated since the day before it started (`update`).
 */
function pagedReader<T>(
  client: DatatourismeClient,
  request: DatatourismeListRequest,
  cursor: string | null,
  pace: () => Promise<void>,
  map: (poi: DatatourismePoiDto) => { item: T } | { skipped: string },
): SyncReader<T> {
  let next = cursor;
  let started = cursor !== null;
  return {
    async next(): Promise<SyncBatch<T> | null> {
      if (started && next === null) return null;
      await pace();
      const page = await client.listPage(request, next);
      started = true;
      next = page.nextCursor;
      const items: T[] = [];
      const skipped = { ...page.skipped };
      for (const poi of page.pois) {
        const mapped = map(poi);
        if ('item' in mapped) items.push(mapped.item);
        else skipped[mapped.skipped] = (skipped[mapped.skipped] ?? 0) + 1;
      }
      return { items, skipped, cursor: next };
    },
  };
}

/** The day before `since`, in Paris: `update` is a date, and a margin loses nothing. */
function updatedSince(since: Date | null): string | undefined {
  if (!since) return undefined;
  return instantToLocal(new Date(since.getTime() - 86_400_000), 'Europe/Paris').date;
}

const asCursor = (cursor: unknown) => (typeof cursor === 'string' ? cursor : null);

export function datatourismePlacesJob(
  client: DatatourismeClient,
  scope: DatatourismeScope,
): PlaceSyncJob {
  return {
    key: `datatourisme:places:${scope.name}`,
    provider: DATATOURISME_PROVIDER,
    entity: 'PLACE',
    open: (cursor, context) =>
      pagedReader<NormalizedPlace>(
        client,
        endpointRequest('placeOfInterest', scope, updatedSince(context.lastSuccessAt)),
        asCursor(cursor),
        context.pace,
        (poi) => ({ item: mapDatatourismePlace(poi) }),
      ),
  };
}

export function datatourismeEventsJob(
  client: DatatourismeClient,
  scope: DatatourismeScope,
): EventSyncJob {
  return {
    key: `datatourisme:events:${scope.name}`,
    provider: DATATOURISME_PROVIDER,
    entity: 'EVENT',
    open: (cursor, context) => {
      const today = parisToday(context.now);
      return pagedReader<NormalizedEvent>(
        client,
        {
          ...endpointRequest('entertainmentAndEvent', scope, updatedSince(context.lastSuccessAt)),
          start: today,
        },
        asCursor(cursor),
        context.pace,
        (poi) => {
          const mapped = mapDatatourismeEvent(poi, today);
          return 'event' in mapped ? { item: mapped.event } : mapped;
        },
      );
    },
  };
}

function endpointRequest(
  endpoint: DatatourismeEndpoint,
  scope: DatatourismeScope,
  since: string | undefined,
): DatatourismeListRequest {
  return {
    endpoint,
    near: scope.near,
    pageSize: DATATOURISME_MAX_PAGE_SIZE,
    ...(since ? { updatedSince: since } : {}),
  };
}
