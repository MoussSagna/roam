/**
 * DATAtourisme API v1 shapes (https://api.datatourisme.fr/v1/openapi.yml) and their runtime validation. Only the fields
 * ROAM requests (`DATATOURISME_FIELDS`) are read; DATAtourisme types never leave this folder. The API returns
 * JSON-LD-like objects: most properties are arrays, texts are language maps (`{"@fr": "…"}`).
 */

/** Explicit field selection (the API returns only these; `fields` replaces its default selection). */
export const DATATOURISME_FIELDS = [
  'uuid',
  'uri',
  'label',
  'type',
  'isObsolete',
  'lastUpdate',
  'lastUpdateDatatourisme',
  'hasBeenCreatedBy.legalName',
  'isLocatedAt.geo.latitude',
  'isLocatedAt.geo.longitude',
  'isLocatedAt.address.streetAddress',
  'isLocatedAt.address.postalCode',
  'isLocatedAt.address.addressLocality',
  'isLocatedAt.address.hasAddressCity.insee',
  'isLocatedAt.address.hasAddressCity.isPartOfDepartment.insee',
  'isLocatedAt.openingHoursSpecification',
  'hasDescription.shortDescription',
  'hasDescription.description',
  'hasContact.homepage',
  'hasMainRepresentation',
  'hasExternalReference',
  'offers.priceSpecification',
  'takesPlaceAt',
].join(',');

export type LanguageMap = Record<string, string>;

export type DatatourismeImageDto = {
  url: string;
  credit: string | null;
  license: string | null;
  rightsStartDate: string | null;
  rightsEndDate: string | null;
};

export type DatatourismeHoursDto = {
  days: string[];
  opens: string | null;
  closes: string | null;
  validFrom: string | null;
  validThrough: string | null;
  note: string | null;
};

export type DatatourismePeriodDto = {
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type DatatourismePriceDto = {
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
};

/** One POI, validated: an id, a name and coordinates are guaranteed. */
export type DatatourismePoiDto = {
  uuid: string;
  uri: string | null;
  label: string;
  types: string[];
  isObsolete: boolean;
  /** Producer's last update, "YYYY-MM-DD". */
  lastUpdate: string | null;
  producer: string | null;
  latitude: number;
  longitude: number;
  streetAddress: string | null;
  postalCode: string | null;
  locality: string | null;
  departmentInsee: string | null;
  description: string | null;
  homepage: string | null;
  images: DatatourismeImageDto[];
  hours: DatatourismeHoursDto[];
  rnbId: string | null;
  periods: DatatourismePeriodDto[];
  prices: DatatourismePriceDto[];
};

export type DatatourismePageDto = {
  pois: DatatourismePoiDto[];
  /** Records returned but invalid, by reason. */
  skipped: Record<string, number>;
  total: number | null;
  /** The raw `meta.next` link — may hold the API key: sanitized by the client before any use or storage. */
  next: string | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const firstText = (value: unknown): string | null => {
  for (const item of list(value)) {
    const found = text(item);
    if (found) return found;
  }
  return null;
};
const number = (value: unknown): number | null => {
  const found = list(value).find((item) => typeof item === 'number' && Number.isFinite(item));
  return (found as number | undefined) ?? null;
};

/** A language map's French text, else the first language's. */
export function inFrench(value: unknown): string | null {
  for (const map of list(value)) {
    if (!isObject(map)) continue;
    const french = firstText(map['@fr']);
    if (french) return french;
    for (const other of Object.values(map)) {
      const found = firstText(other);
      if (found) return found;
    }
  }
  return null;
}

const DAY_NAMES: Record<string, string> = {
  lundi: 'Monday',
  mardi: 'Tuesday',
  mercredi: 'Wednesday',
  jeudi: 'Thursday',
  vendredi: 'Friday',
  samedi: 'Saturday',
  dimanche: 'Sunday',
};
const ENGLISH_DAYS = new Set(Object.values(DAY_NAMES));

function day(value: unknown): string | null {
  if (!isObject(value)) return null;
  const key = text(value.key);
  if (key && ENGLISH_DAYS.has(key)) return key;
  const label = inFrench(value.label)?.toLowerCase();
  return label ? (DAY_NAMES[label] ?? null) : null;
}

function image(value: unknown): DatatourismeImageDto | null {
  if (!isObject(value)) return null;
  const resource = list(value.hasRelatedResource).find(isObject);
  const url = resource ? firstText(resource.locator) : null;
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const annotation = list(value.hasAnnotation).find(isObject) ?? {};
  return {
    url,
    credit: firstText(annotation.credits),
    license: firstText(annotation.isCoveredBy),
    rightsStartDate: firstText(annotation.rightsStartDate)?.slice(0, 10) ?? null,
    rightsEndDate: firstText(annotation.rightsEndDate)?.slice(0, 10) ?? null,
  };
}

function rnb(value: unknown): string | null {
  for (const reference of list(value)) {
    if (!isObject(reference)) continue;
    const platform = list(reference.hasExternalPlatform).find(isObject);
    const url = platform ? firstText(platform.hasExternalPlatformUrl) : null;
    const id = firstText(reference.hasExternalIdentifier);
    if (url?.includes('rnb.beta.gouv.fr') && id && /^[A-Z0-9]{12}$/.test(id)) return id;
  }
  return null;
}

/** Validates one POI; the reason when it cannot be used. */
export function parseDatatourismePoi(
  value: unknown,
): { poi: DatatourismePoiDto } | { skipped: string } {
  if (!isObject(value)) return { skipped: 'invalid' };
  const uuid = text(value.uuid);
  if (!uuid || !/^[0-9a-f-]{36}$/i.test(uuid)) return { skipped: 'no_id' };
  const label = inFrench(value.label);
  if (!label) return { skipped: 'no_name' };
  const place = list(value.isLocatedAt).find(isObject);
  const geo = place && isObject(place.geo) ? place.geo : undefined;
  const latitude = geo ? number(geo.latitude) : null;
  const longitude = geo ? number(geo.longitude) : null;
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return { skipped: 'no_coordinates' };

  const address = place ? list(place.address).find(isObject) : undefined;
  const city = address && isObject(address.hasAddressCity) ? address.hasAddressCity : undefined;
  const department =
    city && isObject(city.isPartOfDepartment) ? text(city.isPartOfDepartment.insee) : null;
  const description = list(value.hasDescription).find(isObject);
  const creator = list(value.hasBeenCreatedBy).find(isObject);

  return {
    poi: {
      uuid,
      uri: text(value.uri),
      label,
      types: list(value.type).filter((item): item is string => typeof item === 'string'),
      isObsolete: value.isObsolete === true,
      lastUpdate: text(value.lastUpdate)?.slice(0, 10) ?? null,
      producer: creator ? text(creator.legalName) : null,
      latitude,
      longitude,
      streetAddress: address
        ? list(address.streetAddress)
            .map(text)
            .filter((line): line is string => line !== null)
            .join(', ') || null
        : null,
      postalCode: address ? text(address.postalCode) : null,
      locality: address ? text(address.addressLocality) : null,
      departmentInsee: department,
      description: description
        ? (inFrench(description.description) ?? inFrench(description.shortDescription))
        : null,
      homepage:
        list(value.hasContact)
          .filter(isObject)
          .map((contact) => firstText(contact.homepage))
          .find((url): url is string => url !== null && /^https?:\/\//i.test(url)) ?? null,
      images: list(value.hasMainRepresentation)
        .map(image)
        .filter((item): item is DatatourismeImageDto => item !== null),
      hours: (place ? list(place.openingHoursSpecification) : []).filter(isObject).map((spec) => ({
        days: list(spec.dayOfWeek)
          .map(day)
          .filter((item): item is string => item !== null),
        opens: firstText(spec.opens)?.slice(0, 5) ?? null,
        closes: firstText(spec.closes)?.slice(0, 5) ?? null,
        validFrom: firstText(spec.validFrom),
        validThrough: firstText(spec.validThrough),
        note: inFrench(spec.additionalInformation),
      })),
      rnbId: rnb(value.hasExternalReference),
      periods: list(value.takesPlaceAt)
        .filter(isObject)
        .map((period) => ({
          startDate: firstText(period.startDate)?.slice(0, 10) ?? null,
          endDate: firstText(period.endDate)?.slice(0, 10) ?? null,
          startTime: firstText(period.startTime)?.slice(0, 5) ?? null,
          endTime: firstText(period.endTime)?.slice(0, 5) ?? null,
        })),
      prices: list(value.offers)
        .filter(isObject)
        .flatMap((offer) => list(offer.priceSpecification).filter(isObject))
        .map((spec) => ({
          minPrice: number(spec.minPrice) ?? number(spec.price),
          maxPrice: number(spec.maxPrice) ?? number(spec.price),
          currency: text(spec.priceCurrency),
        })),
    },
  };
}

/** A list page: `{ objects, meta }`. `null` when the body is not that shape. */
export function parseDatatourismePage(value: unknown): DatatourismePageDto | null {
  if (!isObject(value) || !Array.isArray(value.objects)) return null;
  const meta = isObject(value.meta) ? value.meta : {};
  const pois: DatatourismePoiDto[] = [];
  const skipped: Record<string, number> = {};
  for (const object of value.objects) {
    const parsed = parseDatatourismePoi(object);
    if ('poi' in parsed) pois.push(parsed.poi);
    else skipped[parsed.skipped] = (skipped[parsed.skipped] ?? 0) + 1;
  }
  return {
    pois,
    skipped,
    total: typeof meta.total === 'number' ? meta.total : null,
    next: text(meta.next),
  };
}
