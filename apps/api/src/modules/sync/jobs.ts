import type { ExternalSourceRepository } from '../catalog/external-source.repository.js';
import type {
  EventProvider,
  NearbyEventQuery,
  NearbyPlaceQuery,
  NormalizedEvent,
  NormalizedPlace,
  PlaceProvider,
} from '../providers/provider.types.js';
import { staleBefore } from './freshness.js';
import type {
  EventSyncJob,
  PlaceSyncJob,
  SyncBatch,
  SyncContext,
  SyncReader,
} from './sync.types.js';

/**
 * Generic jobs built on the provider contracts (no per-provider sync code): a search around a point, and the refresh of
 * STALE records one by one. Batch sources (DATAtourisme pages, Basilic file, Data ES pages) build their own jobs in
 * their provider folder, on the same `SyncJob` contract.
 */

/** One provider search = one batch (the adapters do not page). */
function oneBatch<T>(search: () => Promise<T[]>, context: SyncContext): SyncReader<T> {
  let done = false;
  return {
    async next(): Promise<SyncBatch<T> | null> {
      if (done) return null;
      await context.pace();
      const items = await search();
      done = true;
      return { items, skipped: {}, cursor: null };
    },
  };
}

export function nearbyPlacesJob(
  key: string,
  provider: PlaceProvider,
  query: NearbyPlaceQuery,
): PlaceSyncJob {
  return {
    key,
    provider: provider.identity,
    entity: 'PLACE',
    open: (_cursor, context) => oneBatch(() => provider.searchNearby(query), context),
  };
}

export function nearbyEventsJob(
  key: string,
  provider: EventProvider,
  query: NearbyEventQuery,
): EventSyncJob {
  return {
    key,
    provider: provider.identity,
    entity: 'EVENT',
    open: (_cursor, context) => oneBatch(() => provider.searchNearby(query), context),
  };
}

/**
 * Refreshes up to `limit` STALE records of a provider (fetched before their TTL, not obsolete), oldest first, one
 * detail request each. A record the provider no longer knows is **not** deactivated (an unknown id is not a reliable
 * closure signal for every provider): it is counted as skipped `not_found` and stays STALE.
 */
function staleReader<T>(
  sources: ExternalSourceRepository,
  providerKey: string,
  entity: 'PLACE' | 'EVENT',
  limit: number,
  context: SyncContext,
  fetch: (externalId: string) => Promise<T | null>,
): SyncReader<T> {
  let ids: string[] | undefined;
  return {
    async next(): Promise<SyncBatch<T> | null> {
      ids ??= (
        await sources.listStale({
          providerKey,
          entity,
          fetchedBefore: staleBefore(providerKey, entity, context.now),
          limit,
        })
      ).map(({ externalId }) => externalId);
      const id = ids[0];
      if (id === undefined) return null;
      await context.pace();
      const item = await fetch(id);
      ids.shift();
      return item
        ? { items: [item], skipped: {}, cursor: null }
        : { items: [], skipped: { not_found: 1 }, cursor: null };
    },
  };
}

export function stalePlacesJob(
  provider: PlaceProvider,
  sources: ExternalSourceRepository,
  limit: number,
): PlaceSyncJob {
  const key = `${provider.identity.key}:places:refresh-stale`;
  return {
    key,
    provider: provider.identity,
    entity: 'PLACE',
    open: (_cursor, context) =>
      staleReader<NormalizedPlace>(sources, provider.identity.key, 'PLACE', limit, context, (id) =>
        provider.getPlace(id),
      ),
  };
}

export function staleEventsJob(
  provider: EventProvider,
  sources: ExternalSourceRepository,
  limit: number,
): EventSyncJob {
  const key = `${provider.identity.key}:events:refresh-stale`;
  return {
    key,
    provider: provider.identity,
    entity: 'EVENT',
    open: (_cursor, context) =>
      staleReader<NormalizedEvent>(sources, provider.identity.key, 'EVENT', limit, context, (id) =>
        provider.getEvent(id),
      ),
  };
}
