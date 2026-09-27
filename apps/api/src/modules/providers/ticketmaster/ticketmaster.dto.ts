/**
 * Ticketmaster Discovery API v2 response shapes, limited to the fields ROAM reads. Ticketmaster-only: nothing outside
 * `ticketmaster/` imports this file.
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

export type TicketmasterVenueDto = {
  id: string;
  name?: string;
  url?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  /** Present only when both coordinates are valid (Ticketmaster sends them as strings). */
  location?: { latitude: number; longitude: number };
};

export type TicketmasterClassificationDto = {
  primary?: boolean;
  segment?: { id?: string; name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
};

export type TicketmasterPriceRangeDto = {
  type?: string;
  currency?: string;
  min?: number;
  max?: number;
};

/** An event as ROAM reads it. Only `id`, `name` and an absolute start instant are required. */
export type TicketmasterEventDto = {
  id: string;
  name: string;
  url?: string;
  description?: string;
  images: { url: string; width?: number; fallback?: boolean }[];
  /** Absolute instants (ISO 8601 with `Z` or an offset in the payload). */
  start: Date;
  end?: Date;
  timezone?: string;
  statusCode?: string;
  classifications: TicketmasterClassificationDto[];
  priceRanges: TicketmasterPriceRangeDto[];
  /** Distance from the searched point, in kilometres (Event Search only, with `unit=km`). */
  distanceKm?: number;
  venue?: TicketmasterVenueDto;
};

/** Ticketmaster's error bodies: `{ fault }` (gateway: key, quota) or `{ errors: [...] }` (API). */
export type TicketmasterErrorBody = {
  fault?: { faultstring?: unknown; detail?: { errorcode?: unknown } };
  errors?: { code?: unknown; detail?: unknown }[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;
const optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const objects = (value: unknown) => (Array.isArray(value) ? value.filter(isObject) : []);

/**
 * An ISO 8601 instant **with** its zone (`Z` or `±hh:mm`). A string without a zone is refused rather than parsed in the
 * server's local time — the class of bug that once shifted session expiries.
 */
const ZONED_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;
export function parseInstant(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !ZONED_ISO.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function coordinate(value: unknown, limit: number): number | undefined {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= limit
    ? number
    : undefined;
}

function parseVenue(value: unknown): TicketmasterVenueDto | undefined {
  if (!isObject(value)) return undefined;
  const id = optionalString(value.id);
  if (!id) return undefined;
  const location = isObject(value.location) ? value.location : {};
  const latitude = coordinate(location.latitude, 90);
  const longitude = coordinate(location.longitude, 180);
  return {
    id,
    name: optionalString(value.name),
    url: optionalString(value.url),
    addressLine1: isObject(value.address) ? optionalString(value.address.line1) : undefined,
    postalCode: optionalString(value.postalCode),
    city: isObject(value.city) ? optionalString(value.city.name) : undefined,
    location:
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined,
  };
}

/**
 * Validates one event. `null` when a field ROAM cannot do without is missing or invalid (id, name, an absolute start
 * instant) or when Ticketmaster flags it as a test entity; optional fields of the wrong type are dropped, never guessed.
 * An event whose date or time is still to be announced has no `start.dateTime`: it is dropped, not given an invented
 * time.
 */
export function parseTicketmasterEvent(value: unknown): TicketmasterEventDto | null {
  if (!isObject(value) || value.test === true) return null;
  const id = optionalString(value.id);
  const name = optionalString(value.name);
  if (!id || !name) return null;
  const dates = isObject(value.dates) ? value.dates : {};
  const startDates = isObject(dates.start) ? dates.start : {};
  const start = parseInstant(startDates.dateTime);
  if (!start) return null;
  const end = isObject(dates.end) ? parseInstant(dates.end.dateTime) : undefined;
  const embedded = isObject(value._embedded) ? value._embedded : {};

  return {
    id,
    name,
    url: optionalString(value.url),
    description: optionalString(value.description),
    images: objects(value.images).flatMap((image) => {
      const url = optionalString(image.url);
      return url
        ? [
            {
              url,
              width: optionalNumber(image.width),
              fallback: typeof image.fallback === 'boolean' ? image.fallback : undefined,
            },
          ]
        : [];
    }),
    start,
    end,
    timezone: optionalString(dates.timezone),
    statusCode: isObject(dates.status) ? optionalString(dates.status.code) : undefined,
    classifications: objects(value.classifications).map((classification) => ({
      primary: typeof classification.primary === 'boolean' ? classification.primary : undefined,
      segment: isObject(classification.segment)
        ? {
            id: optionalString(classification.segment.id),
            name: optionalString(classification.segment.name),
          }
        : undefined,
      genre: isObject(classification.genre)
        ? { name: optionalString(classification.genre.name) }
        : undefined,
      subGenre: isObject(classification.subGenre)
        ? { name: optionalString(classification.subGenre.name) }
        : undefined,
    })),
    priceRanges: objects(value.priceRanges).map((range) => ({
      type: optionalString(range.type),
      currency: optionalString(range.currency),
      min: optionalNumber(range.min),
      max: optionalNumber(range.max),
    })),
    distanceKm: optionalNumber(value.distance),
    venue: objects(embedded.venues).map(parseVenue).find(Boolean),
  };
}

/**
 * Validates an Event Search body: `{ _embedded?: { events: unknown[] }, page }` (Ticketmaster omits `_embedded` when
 * nothing matches). `null` when the body itself is not that shape; events that fail validation are counted in
 * `skipped`.
 */
export function parseEventSearchResponse(
  value: unknown,
): { events: TicketmasterEventDto[]; skipped: number } | null {
  if (!isObject(value) || !isObject(value.page)) return null;
  if (value._embedded === undefined) return { events: [], skipped: 0 };
  if (!isObject(value._embedded) || !Array.isArray(value._embedded.events)) return null;
  const events = value._embedded.events.map(parseTicketmasterEvent);
  const valid = events.filter((event): event is TicketmasterEventDto => event !== null);
  return { events: valid, skipped: events.length - valid.length };
}
