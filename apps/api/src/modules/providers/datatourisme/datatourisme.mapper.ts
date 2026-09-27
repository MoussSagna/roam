import { instantToLocal } from '../event-timing.js';
import { communeName, timeZoneOfDepartment } from '../france.js';
import { isForbiddenLicense } from '../image-rights.js';
import type {
  NormalizedEvent,
  NormalizedPlace,
  OpeningHours,
  SourceImage,
} from '../provider.types.js';
import { DATATOURISME_PROVIDER } from './datatourisme.client.js';
import type { DatatourismePeriodDto, DatatourismePoiDto } from './datatourisme.dto.js';

/**
 * DATAtourisme class → ROAM category, most specific first (a POI has several unordered classes). Conservative: any
 * other class gives no ROAM category and stays in `providerCategories`. No new ROAM category (OPEN_DATA_SOURCES.md §5).
 */
const PLACE_CATEGORIES: readonly [string, string][] = [
  ['CafeOrTeahouse', 'cafe'],
  ['BarOrPub', 'bar'],
  ['Restaurant', 'restaurant'],
  ['Museum', 'culture'],
  ['Theater', 'culture'],
  ['Cinema', 'culture'],
  ['CulturalSite', 'culture'],
  ['ParkAndGarden', 'park'],
  ['NaturalPark', 'nature'],
  ['NaturalHeritage', 'nature'],
];
const EVENT_CULTURE = new Set([
  'CulturalEvent',
  'Concert',
  'Exhibition',
  'ExhibitionEvent',
  'Festival',
  'ShowEvent',
  'TheaterEvent',
]);

const MAX_IMAGES = 5;
const MAX_PROVIDER_CATEGORIES = 20;
/** DATAtourisme dates are calendar days; stored as that day at 00:00 UTC (read back with its UTC date part). */
const dayInstant = (date: string | null) => (date ? new Date(`${date}T00:00:00.000Z`) : null);

function address(poi: DatatourismePoiDto): string | null {
  const locality = [poi.postalCode, poi.locality].filter(Boolean).join(' ');
  return [poi.streetAddress, locality].filter(Boolean).join(', ') || null;
}

/** Images ROAM may keep: licence not explicitly non-commercial / no-derivatives. Rights kept with each image. */
export function datatourismeImages(poi: DatatourismePoiDto): SourceImage[] {
  return poi.images
    .filter((image) => !isForbiddenLicense(image.license))
    .slice(0, MAX_IMAGES)
    .map((image) => ({ ...image }));
}

function openingHours(poi: DatatourismePoiDto, zone: string | null): OpeningHours | null {
  // `validFrom`/`validThrough` are instants (local midnight in UTC): back to the local calendar day.
  const day = (value: string | null) => {
    if (!value) return null;
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime())) return null;
    return zone ? instantToLocal(instant, zone).date : null;
  };
  const periods = poi.hours
    .filter((hours) => hours.opens || hours.closes)
    .map((hours) => ({
      days: hours.days,
      opens: hours.opens,
      closes: hours.closes,
      validFrom: day(hours.validFrom),
      validThrough: day(hours.validThrough),
    }));
  const note = poi.hours.map((hours) => hours.note).find((value) => value) ?? null;
  return periods.length || note ? { periods, note } : null;
}

function zoneOf(poi: DatatourismePoiDto): string | null {
  return timeZoneOfDepartment(poi.departmentInsee);
}

function source(poi: DatatourismePoiDto) {
  return {
    providerKey: DATATOURISME_PROVIDER.key,
    externalId: poi.uuid,
    externalUrl: poi.uri,
    providerCategories: poi.types.slice(0, MAX_PROVIDER_CATEGORIES),
  };
}

/** A DATAtourisme place → NormalizedPlace (provider facts only). */
export function mapDatatourismePlace(poi: DatatourismePoiDto): NormalizedPlace {
  const category = PLACE_CATEGORIES.find(([type]) => poi.types.includes(type))?.[1];
  return {
    source: source(poi),
    name: poi.label,
    address: address(poi),
    city: communeName(poi.locality),
    latitude: poi.latitude,
    longitude: poi.longitude,
    priceLevel: 'UNKNOWN',
    // `hasReview` is an official classification (stars, labels), not a user rating.
    rating: null,
    reviewCount: null,
    isActive: !poi.isObsolete,
    categorySlugs: category ? [category] : [],
    description: poi.description,
    website: poi.homepage,
    openingHours: openingHours(poi, zoneOf(poi)),
    rnbId: poi.rnbId,
    images: datatourismeImages(poi),
    // Licence obligation: the producer (`hasBeenCreatedBy`) and the date of last update.
    attribution: poi.producer,
    providerUpdatedAt: dayInstant(poi.lastUpdate),
  };
}

/**
 * The period an event is stored with: the first one not over on `today` (local calendar date). Recurrences are not
 * expanded into invented occurrences. `null` when every period is over or none is usable.
 */
export function currentPeriod(
  periods: DatatourismePeriodDto[],
  today: string,
): DatatourismePeriodDto | null {
  return (
    periods
      .filter((period) => period.startDate)
      .sort((a, b) => a.startDate!.localeCompare(b.startDate!))
      .find((period) => (period.endDate ?? period.startDate!) >= today) ?? null
  );
}

export type EventMapping = { event: NormalizedEvent } | { skipped: string };

/**
 * A DATAtourisme event → NormalizedEvent: local dates (and times when given) in the commune's zone, the event's own
 * location (no venue record exists), the first coherent price. Skipped: no period, every period over, a period
 * ending before it starts (never "fixed").
 */
export function mapDatatourismeEvent(poi: DatatourismePoiDto, today: string): EventMapping {
  const dated = poi.periods.filter((period) => period.startDate);
  if (dated.length === 0) return { skipped: 'no_dates' };
  // A period ending before it starts is incoherent (observed): never "fixed", never chosen.
  const coherent = dated.filter((period) => !period.endDate || period.endDate >= period.startDate!);
  if (coherent.length === 0) return { skipped: 'end_before_start' };
  const period = currentPeriod(coherent, today);
  if (!period) return { skipped: 'past' };

  const price = poi.prices.find(
    (spec) =>
      spec.currency &&
      /^[A-Z]{3}$/.test(spec.currency) &&
      spec.minPrice !== null &&
      spec.maxPrice !== null &&
      spec.minPrice >= 0 &&
      spec.minPrice <= spec.maxPrice,
  );
  return {
    event: {
      source: source(poi),
      title: poi.label,
      description: poi.description,
      startDate: null,
      endDate: null,
      timezone: zoneOf(poi),
      // A multi-day period with times: its first start and its last end (the times are the daily ones).
      localStartDate: period.startDate,
      localStartTime: period.startTime,
      // An end time on a period without an end date ends the same day.
      localEndDate: period.endDate ?? (period.endTime ? period.startDate : null),
      localEndTime: period.endTime,
      location: {
        address: address(poi),
        city: communeName(poi.locality),
        latitude: poi.latitude,
        longitude: poi.longitude,
      },
      // Images keep their rights on the provider record (`sourceImages`), never as bare URLs.
      images: [],
      sourceImages: datatourismeImages(poi),
      priceMin: price?.minPrice ?? null,
      priceMax: price?.maxPrice ?? null,
      currency: price?.currency ?? null,
      priceLevel: price && price.maxPrice === 0 ? 'FREE' : 'UNKNOWN',
      bookingUrl: poi.homepage,
      isActive: !poi.isObsolete,
      categorySlug: poi.types.some((type) => EVENT_CULTURE.has(type)) ? 'culture' : null,
      venue: null,
      attribution: poi.producer,
      providerUpdatedAt: dayInstant(poi.lastUpdate),
    },
  };
}
