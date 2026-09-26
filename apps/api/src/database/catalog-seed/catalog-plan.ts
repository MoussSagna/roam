import type { EnrichmentSource, PriceLevel } from '../../generated/prisma/enums.js';
import type { JsonValue } from '../json.js';
import { catalogId } from './catalog-id.js';
import type { MockBudget, MockCatalog, MockExperience, MockPlace } from './mobile-mock-catalog.js';

/**
 * DATA-1: the mobile mock catalog mapped to the canonical model (EXPERIENCE.md, PLACE.md, DATABASE_SCHEMA.md) —
 * pure functions, no database. Every rule below is documented in apidocs/DATA_1_MIGRATION_REPORT.md. Nothing is
 * invented: a value the mocks do not carry stays null / UNKNOWN / empty (DATA_RULES.md).
 */

/**
 * Mobile category slug → canonical `Category.slug`. The mobile `Category` already is a stable slug and the canonical
 * model stores exactly that, so the mapping is the identity — explicit, so an unmapped mobile slug fails the plan
 * instead of creating a category silently.
 */
export const CATEGORY_SLUG_MAPPING: Readonly<Record<string, string>> = {
  cafe: 'cafe',
  park: 'park',
  restaurant: 'restaurant',
  bar: 'bar',
  culture: 'culture',
  nature: 'nature',
  experience: 'experience',
};

/** The mock values are hand-authored, not provider facts nor rule output: `CURATED`, with that basis recorded. */
const ENRICHMENT_SOURCE: EnrichmentSource = 'CURATED';
const MOCK_BASIS = { basis: 'mobile_mock_migration', note: 'hand-authored mobile mock value' };

export type PlannedEnrichment = {
  tags: string[];
  estimatedDurationMin: number | null;
  durationIsDerived: boolean;
  source: EnrichmentSource;
  confidence: JsonValue;
};

export type Pricing = {
  priceLevel: PriceLevel;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
};

export type PlannedCategory = { id: string; slug: string };

export type PlannedPlace = {
  id: string;
  /** Mobile ids merged into this place (one after deduplication, usually); each keeps its provenance row. */
  mockIds: string[];
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  priceLevel: PriceLevel;
  categorySlugs: string[];
  enrichment: PlannedEnrichment | null;
};

export type PlannedExperience = {
  id: string;
  mockId: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  categorySlugs: string[];
  /** Canonical place ids, ordered, distinct. */
  placeIds: string[];
  enrichment: PlannedEnrichment;
} & Pricing;

/** A mock value the canonical model cannot hold (yet), reported instead of being dropped silently. */
export type NotMigrated = {
  entity: 'place' | 'experience';
  mockId: string;
  field: string;
  value: JsonValue;
  reason: string;
};

export type CatalogPlan = {
  categories: PlannedCategory[];
  places: PlannedPlace[];
  experiences: PlannedExperience[];
  notMigrated: NotMigrated[];
};

export class CatalogPlanError extends Error {
  constructor(readonly problems: string[]) {
    super(`The mobile mock catalog cannot be migrated:\n- ${problems.join('\n- ')}`);
    this.name = 'CatalogPlanError';
  }
}

const REASON_MOOD =
  'no mood field on the canonical model and no agreed mapping between the mobile moods and atmosphere/energy ' +
  '(open product decision — EXPERIENCE_CATALOG_API.md, DOMAIN_OVERVIEW.md)';
const REASON_PLACE_PRICE =
  'a place has no price amount, and no documented mapping turns a budget bracket into a price level';

/**
 * Pricing of an experience from its mobile budget bracket (MVP_SCOPE.md §3: Free, < 10 €, 10–25 €, 25–50 €,
 * 50 €+). The bracket is a range, stored as the range's own bounds — never a single made-up price; a bound the
 * bracket does not state stays null. `free` is the only bracket that is also a price level; the level of the others
 * stays `UNKNOWN` (no documented bracket → level mapping). The mock `priceLabel` is a display string, not a price
 * (mobile `features/journey/lib/plan.ts`), and is not read.
 */
export function pricingFromBudget(budget: MockBudget): Pricing {
  switch (budget) {
    case 'free':
      return { priceLevel: 'FREE', priceMin: 0, priceMax: 0, currency: 'EUR' };
    case 'under10':
      return { priceLevel: 'UNKNOWN', priceMin: null, priceMax: 10, currency: 'EUR' };
    case '10to25':
      return { priceLevel: 'UNKNOWN', priceMin: 10, priceMax: 25, currency: 'EUR' };
    case '25to50':
      return { priceLevel: 'UNKNOWN', priceMin: 25, priceMax: 50, currency: 'EUR' };
    case '50plus':
      return { priceLevel: 'UNKNOWN', priceMin: 50, priceMax: null, currency: 'EUR' };
  }
}

/** A place has a price level only: `free` is one, the other brackets have no documented level. */
export function placePriceLevel(budget: MockBudget): PriceLevel {
  return budget === 'free' ? 'FREE' : 'UNKNOWN';
}

/**
 * The city of a French address as the mocks write it: the last comma-separated part, without its postal code
 * ("12 place de la République, 75011 Paris" → "Paris", "Rue Botzaris, Paris" → "Paris"). No comma: null (the
 * address alone does not say which part is the city — nothing is guessed).
 */
export function cityFromAddress(address: string | undefined): string | null {
  if (!address?.includes(',')) return null;
  const last = address.slice(address.lastIndexOf(',') + 1).trim();
  const city = last.replace(/^\d{5}\s+/, '').trim();
  return city.length > 0 ? city : null;
}

/** Deduplication key of a place: normalized name + exact coordinates (EXPERIENCE.md: never on the name alone). */
export function placeKey(place: Pick<MockPlace, 'name' | 'coordinates'>): string {
  const name = place.name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const { latitude, longitude } = place.coordinates;
  return `${name}|${latitude.toFixed(5)}|${longitude.toFixed(5)}`;
}

function enrichment(
  fields: Pick<PlannedEnrichment, 'tags' | 'estimatedDurationMin' | 'durationIsDerived'>,
): PlannedEnrichment {
  const basis: Record<string, JsonValue> = {};
  if (fields.tags.length > 0) basis.tags = MOCK_BASIS;
  if (fields.estimatedDurationMin !== null) basis.estimatedDurationMin = MOCK_BASIS;
  return { ...fields, source: ENRICHMENT_SOURCE, confidence: basis };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Maps the whole mock catalog. Throws `CatalogPlanError` listing every problem (unknown category or place,
 * unmapped slug, duplicate id) rather than migrating a partial catalog.
 */
export function buildCatalogPlan(source: MockCatalog): CatalogPlan {
  const problems: string[] = [];
  const duplicates = (ids: string[]) => ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const [kind, ids] of [
    ['category', source.categories.map((category) => category.id)],
    ['place', source.places.map((place) => place.id)],
    ['experience', source.experiences.map((experience) => experience.id)],
  ] as const) {
    for (const id of unique(duplicates(ids))) problems.push(`duplicate ${kind} id "${id}"`);
  }

  // Categories: mobile id → canonical slug.
  const slugByMockId = new Map<string, string>();
  for (const category of source.categories) {
    const slug = CATEGORY_SLUG_MAPPING[category.slug];
    if (slug === undefined)
      problems.push(`category "${category.id}": no mapping for slug "${category.slug}"`);
    else slugByMockId.set(category.id, slug);
  }
  const slugsOf = (owner: string, ids: string[]) =>
    unique(
      ids.flatMap((id) => {
        const slug = slugByMockId.get(id);
        if (slug === undefined) problems.push(`${owner}: unknown category "${id}"`);
        return slug ?? [];
      }),
    );
  const categories = unique([...slugByMockId.values()]).map((slug) => ({
    id: catalogId('category', slug),
    slug,
  }));

  // Places, deduplicated: the first mock place of a key is the canonical one.
  const notMigrated: NotMigrated[] = [];
  const places: PlannedPlace[] = [];
  const placeByKey = new Map<string, PlannedPlace>();
  const placeIdByMockId = new Map<string, string>();
  for (const mock of source.places) {
    const key = placeKey(mock);
    const existing = placeByKey.get(key);
    if (existing) {
      existing.mockIds.push(mock.id);
      placeIdByMockId.set(mock.id, existing.id);
      continue;
    }
    const place: PlannedPlace = {
      id: catalogId('place', mock.id),
      mockIds: [mock.id],
      name: mock.name,
      description: mock.description,
      address: mock.address,
      city: cityFromAddress(mock.address),
      latitude: mock.coordinates.latitude,
      longitude: mock.coordinates.longitude,
      priceLevel: placePriceLevel(mock.price),
      categorySlugs: slugsOf(`place "${mock.id}"`, [mock.categoryId]),
      enrichment:
        mock.tags.length > 0
          ? enrichment({ tags: mock.tags, estimatedDurationMin: null, durationIsDerived: false })
          : null,
    };
    if (place.priceLevel === 'UNKNOWN') {
      notMigrated.push({
        entity: 'place',
        mockId: mock.id,
        field: 'price',
        value: mock.price,
        reason: REASON_PLACE_PRICE,
      });
    }
    places.push(place);
    placeByKey.set(key, place);
    placeIdByMockId.set(mock.id, place.id);
  }

  const experiences = source.experiences.map((mock): PlannedExperience => {
    const placeIds = unique(
      mock.placeIds.flatMap((id) => {
        const placeId = placeIdByMockId.get(id);
        if (placeId === undefined) problems.push(`experience "${mock.id}": unknown place "${id}"`);
        return placeId ?? [];
      }),
    );
    if (mock.moods.length > 0) {
      notMigrated.push({
        entity: 'experience',
        mockId: mock.id,
        field: 'moods',
        value: mock.moods,
        reason: REASON_MOOD,
      });
    }
    return experienceRecord(mock, slugsOf(`experience "${mock.id}"`, mock.categoryIds), placeIds);
  });

  if (problems.length > 0) throw new CatalogPlanError(problems);
  return { categories, places, experiences, notMigrated };
}

function experienceRecord(
  mock: MockExperience,
  categorySlugs: string[],
  placeIds: string[],
): PlannedExperience {
  return {
    id: catalogId('experience', mock.id),
    mockId: mock.id,
    title: mock.title,
    description: mock.description,
    address: mock.address ?? null,
    city: cityFromAddress(mock.address),
    latitude: mock.coordinates?.latitude ?? null,
    longitude: mock.coordinates?.longitude ?? null,
    ...pricingFromBudget(mock.estimatedBudget),
    rating: mock.rating ?? null,
    reviewCount: mock.reviewCount ?? null,
    categorySlugs,
    placeIds,
    // The mobile duration is an estimate authored with the mock, not a provider fact: derived (EXPERIENCE.md).
    enrichment: enrichment({
      tags: mock.tags ?? [],
      estimatedDurationMin: mock.estimatedDurationMin,
      durationIsDerived: true,
    }),
  };
}
