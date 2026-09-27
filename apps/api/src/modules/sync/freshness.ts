/**
 * Freshness and TTLs (DATA_PERSISTENCE_AND_SYNC.md "Freshness", "TTL"). PostgreSQL is the cache: a provider record
 * (`ExternalSource`) is FRESH until `fetchedAt + TTL`, then STALE (to refresh), and OBSOLETE once its provider declared
 * it so (`obsoleteAt`) — an obsolete record is never refreshed back to life by a TTL, only by the provider.
 */
export type Freshness = 'FRESH' | 'STALE' | 'OBSOLETE';
export type SourceEntity = 'PLACE' | 'EVENT';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * TTL per provider and entity. Each value is justified in DATA_PERSISTENCE_AND_SYNC.md "TTL" (provider terms, update
 * frequency, cost). A provider/entity missing here has no TTL: `ttlFor` throws, so nothing is refreshed by accident.
 */
export const SOURCE_TTLS: Record<string, Partial<Record<SourceEntity, number>>> = {
  // Google Maps Platform terms: place data other than the place id may be cached at most 30 days.
  google_places: { PLACE: 30 * DAY },
  // OpenStreetMap data changes slowly; every refresh costs free-plan credits.
  geoapify: { PLACE: 30 * DAY },
  // Events move (status, prices, cancellation); venues rarely.
  ticketmaster: { EVENT: 1 * DAY, PLACE: 7 * DAY },
  // Flows updated daily; places updated by producers at least yearly, events daily (DATAtourisme FAQ).
  datatourisme: { PLACE: 7 * DAY, EVENT: 1 * DAY },
  // Published punctually (last file 2026-02-18): a monthly check is plenty.
  basilic: { PLACE: 30 * DAY },
  // Updated daily (portal metadata, observed daily modification).
  data_es: { PLACE: 1 * DAY },
};

export function ttlFor(providerKey: string, entity: SourceEntity): number {
  const ttl = SOURCE_TTLS[providerKey]?.[entity];
  if (ttl === undefined) throw new RangeError(`no TTL defined for ${providerKey} ${entity}`);
  return ttl;
}

export function freshnessOf(
  source: { fetchedAt: Date; obsoleteAt: Date | null },
  ttlMs: number,
  now: Date,
): Freshness {
  if (source.obsoleteAt) return 'OBSOLETE';
  return now.getTime() < source.fetchedAt.getTime() + ttlMs ? 'FRESH' : 'STALE';
}

/** Records fetched before this instant are STALE. */
export function staleBefore(providerKey: string, entity: SourceEntity, now: Date): Date {
  return new Date(now.getTime() - ttlFor(providerKey, entity));
}
