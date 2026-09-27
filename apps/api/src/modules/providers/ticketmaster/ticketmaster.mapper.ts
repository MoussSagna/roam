import type { NormalizedEvent, NormalizedPlace } from '../provider.types.js';
import { TICKETMASTER_PROVIDER } from './ticketmaster.client.js';
import type {
  TicketmasterClassificationDto,
  TicketmasterEventDto,
  TicketmasterVenueDto,
} from './ticketmaster.dto.js';

/**
 * Ticketmaster segments (by their stable id) → ROAM category slugs (the DATA-1 vocabulary). Explicit and conservative:
 * only `Arts & Theatre` (theatre, comedy, dance, opera, fine art…) is cultural by definition. Music, Sports, Film and
 * Miscellaneous have no ROAM equivalent (ROAM has no music, sport or cinema category): such an event is kept, without
 * a category, its classification preserved in the provenance.
 */
export const TICKETMASTER_SEGMENT_TO_CATEGORY: Readonly<Record<string, string>> = {
  KZFzniwnSyZfZ7v7na: 'culture',
};

/** The Ticketmaster segment ids of ROAM categories (Event Search `segmentId`). Unknown slugs give none. */
export function segmentIdsForCategories(slugs: readonly string[]): string[] {
  return Object.entries(TICKETMASTER_SEGMENT_TO_CATEGORY)
    .filter(([, slug]) => slugs.includes(slug))
    .map(([segmentId]) => segmentId);
}

/** At most this many image URLs per event (Ticketmaster sends ~10 sizes of the same picture). */
export const MAX_IMAGES = 5;

const primaryClassification = (classifications: TicketmasterClassificationDto[]) =>
  classifications.find((classification) => classification.primary) ?? classifications[0];

/** The classification as received, level by level (`segment:Arts & Theatre`, `genre:Theatre`…), without `Undefined`. */
function providerCategories(classifications: TicketmasterClassificationDto[]): string[] {
  const values = classifications.flatMap((classification) =>
    (
      [
        ['segment', classification.segment?.name],
        ['genre', classification.genre?.name],
        ['subGenre', classification.subGenre?.name],
      ] as const
    ).flatMap(([level, name]) => (name && name !== 'Undefined' ? [`${level}:${name}`] : [])),
  );
  return [...new Set(values)];
}

/** The first coherent price range (standard tickets first): never a made-up price. */
function price(event: TicketmasterEventDto) {
  const ranges = [...event.priceRanges].sort(
    (a, b) => Number(b.type === 'standard') - Number(a.type === 'standard'),
  );
  const range = ranges.find(
    (candidate) =>
      !!candidate.currency &&
      /^[A-Z]{3}$/.test(candidate.currency) &&
      (candidate.min ?? 0) >= 0 &&
      (candidate.max ?? 0) >= 0 &&
      (candidate.min === undefined ||
        candidate.max === undefined ||
        candidate.min <= candidate.max) &&
      (candidate.min !== undefined || candidate.max !== undefined),
  );
  return {
    priceMin: range?.min ?? null,
    priceMax: range?.max ?? null,
    currency: range?.currency ?? null,
  };
}

/** The event's own pictures first, then the largest. */
function images(event: TicketmasterEventDto): string[] {
  const sorted = [...event.images].sort(
    (a, b) =>
      Number(a.fallback === true) - Number(b.fallback === true) || (b.width ?? 0) - (a.width ?? 0),
  );
  return [...new Set(sorted.map((image) => image.url))].slice(0, MAX_IMAGES);
}

/**
 * A venue → a normalized place (the place-provider contract), `null` without a name or valid coordinates (a place needs
 * both). Provider facts only: no category (a venue's kind is not given), no rating or price.
 */
export function mapTicketmasterVenueToRoamPlace(
  venue: TicketmasterVenueDto,
): NormalizedPlace | null {
  const name = venue.name?.trim();
  if (!name || !venue.location) return null;
  const locality = [venue.postalCode?.trim(), venue.city?.trim()].filter(Boolean).join(' ');
  const address = [venue.addressLine1?.trim(), locality].filter(Boolean).join(', ');
  return {
    source: {
      providerKey: TICKETMASTER_PROVIDER.key,
      externalId: venue.id,
      externalUrl: venue.url ?? null,
      providerCategories: [],
    },
    name,
    address: address || null,
    city: venue.city?.trim() || null,
    latitude: venue.location.latitude,
    longitude: venue.location.longitude,
    priceLevel: 'UNKNOWN',
    rating: null,
    reviewCount: null,
    isActive: true,
    categorySlugs: [],
  };
}

/**
 * A validated Ticketmaster event → a ROAM normalized event: provider facts only. Instants are kept absolute (UTC);
 * the IANA timezone is kept as given. Missing facts stay `null`: no end time, price, description or venue is invented.
 */
export function mapTicketmasterEventToRoamEvent(event: TicketmasterEventDto): NormalizedEvent {
  const classification = primaryClassification(event.classifications);
  const segmentId = classification?.segment?.id;
  const url = event.url ?? null;
  // An end before the start is not a fact to keep.
  const endDate = event.end && event.end.getTime() >= event.start.getTime() ? event.end : null;

  return {
    source: {
      providerKey: TICKETMASTER_PROVIDER.key,
      externalId: event.id,
      externalUrl: url,
      providerCategories: providerCategories(event.classifications),
    },
    title: event.name.trim(),
    description: event.description?.trim() || null,
    startDate: event.start,
    endDate,
    timezone: event.timezone ?? null,
    images: images(event),
    ...price(event),
    // Amounts are kept; turning them into a price level needs a ROAM rule that does not exist yet.
    priceLevel: 'UNKNOWN',
    bookingUrl: url,
    isActive: event.statusCode !== 'cancelled' && event.statusCode !== 'canceled',
    categorySlug:
      segmentId && Object.hasOwn(TICKETMASTER_SEGMENT_TO_CATEGORY, segmentId)
        ? TICKETMASTER_SEGMENT_TO_CATEGORY[segmentId]
        : null,
    venue: event.venue ? mapTicketmasterVenueToRoamPlace(event.venue) : null,
  };
}
