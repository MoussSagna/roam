import { decimalOutput, jsonInput, jsonOutput, type JsonValue } from '../../database/json.js';
import { fromDbDate } from '../../database/local-date.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { SourceEntityType } from '../../generated/prisma/enums.js';
import type {
  Enrichment,
  Event,
  Experience,
  Place,
  Source,
  SourceImage,
  SourceInput,
} from './catalog.types.js';

/** Prisma ↔ domain for the catalog repositories (the only place that knows both shapes). */

const categorySlugs = { select: { category: { select: { slug: true } } } } as const;

export const PLACE_INCLUDE = {
  categories: categorySlugs,
  enrichment: true,
} as const satisfies Prisma.PlaceInclude;

export const EXPERIENCE_INCLUDE = {
  categories: categorySlugs,
  places: { orderBy: { position: 'asc' }, select: { placeId: true } },
  enrichment: true,
} as const satisfies Prisma.ExperienceInclude;

export const EXPERIENCE_DETAIL_INCLUDE = {
  ...EXPERIENCE_INCLUDE,
  places: { orderBy: { position: 'asc' }, include: { place: { include: PLACE_INCLUDE } } },
} as const satisfies Prisma.ExperienceInclude;

export const EVENT_INCLUDE = {
  category: { select: { slug: true } },
} as const satisfies Prisma.EventInclude;

type PlaceRow = Prisma.PlaceGetPayload<{ include: typeof PLACE_INCLUDE }>;
type ExperienceRow = Prisma.ExperienceGetPayload<{ include: typeof EXPERIENCE_INCLUDE }>;
type ExperienceDetailRow = Prisma.ExperienceGetPayload<{
  include: typeof EXPERIENCE_DETAIL_INCLUDE;
}>;
type EventRow = Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>;

export function toEnrichment(
  row: Prisma.RoamEnrichmentGetPayload<object> | null,
): Enrichment | null {
  if (!row) return null;
  return {
    atmosphere: row.atmosphere,
    energyLevel: row.energyLevel,
    suitableFor: row.suitableFor,
    bestMoments: row.bestMoments,
    tags: row.tags,
    estimatedDurationMin: row.estimatedDurationMin,
    durationIsDerived: row.durationIsDerived,
    source: row.source,
    confidence: jsonOutput(row.confidence),
  };
}

export function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    photos: row.photos,
    openingHours: jsonOutput(row.openingHours),
    priceLevel: row.priceLevel,
    rating: row.rating,
    reviewCount: row.reviewCount,
    attributes: jsonOutput(row.attributes),
    website: row.website,
    rnbId: row.rnbId,
    isActive: row.isActive,
    categorySlugs: row.categories.map(({ category }) => category.slug),
    enrichment: toEnrichment(row.enrichment),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toExperience(row: ExperienceRow | ExperienceDetailRow): Experience {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    coverImage: row.coverImage,
    images: row.images,
    startDate: row.startDate,
    endDate: row.endDate,
    openingHours: jsonOutput(row.openingHours),
    priceLevel: row.priceLevel,
    priceMin: decimalOutput(row.priceMin),
    priceMax: decimalOutput(row.priceMax),
    currency: row.currency,
    rating: row.rating,
    reviewCount: row.reviewCount,
    popularity: row.popularity,
    isActive: row.isActive,
    categorySlugs: row.categories.map(({ category }) => category.slug),
    placeIds: row.places.map(({ placeId }) => placeId),
    enrichment: toEnrichment(row.enrichment),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toExperienceDetail(row: ExperienceDetailRow) {
  return { ...toExperience(row), places: row.places.map(({ place }) => toPlace(place)) };
}

export function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    experienceId: row.experienceId,
    placeId: row.placeId,
    categorySlug: row.category?.slug ?? null,
    title: row.title,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    timezone: row.timezone,
    localStartDate: fromDbDate(row.localStartDate),
    localStartTime: row.localStartTime,
    localEndDate: fromDbDate(row.localEndDate),
    localEndTime: row.localEndTime,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    images: row.images,
    priceMin: decimalOutput(row.priceMin),
    priceMax: decimalOutput(row.priceMax),
    currency: row.currency,
    priceLevel: row.priceLevel,
    bookingUrl: row.bookingUrl,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Links categories by slug. An unknown slug fails the whole write (`RecordNotFoundError`). */
export function categoryLinks(slugs: string[] | undefined) {
  return slugs?.length
    ? { create: slugs.map((slug) => ({ category: { connect: { slug } } })) }
    : undefined;
}

/** The provenance row of an imported record; the provider is registered on first use. */
export function sourceCreate(source: SourceInput, entityType: SourceEntityType) {
  return {
    entityType,
    externalId: source.externalId,
    externalUrl: source.externalUrl ?? null,
    providerCategories: source.providerCategories ?? [],
    confidence: source.confidence ?? null,
    fetchedAt: source.fetchedAt,
    providerUpdatedAt: source.providerUpdatedAt ?? null,
    attribution: source.attribution ?? null,
    images: jsonInput(imagesJson(source.images)),
    obsoleteAt: source.obsoleteAt ?? null,
    provider: {
      connectOrCreate: {
        where: { key: source.provider.key },
        create: { key: source.provider.key, name: source.provider.name },
      },
    },
  };
}

/** Images for the `ExternalSource.images` JSON column (`undefined` → unchanged, empty → NULL). */
export function imagesJson(images: SourceImage[] | undefined): JsonValue | undefined {
  if (images === undefined) return undefined;
  return images.length ? images.map((image) => ({ ...image })) : null;
}

export const SOURCE_INCLUDE = { provider: { select: { key: true, name: true } } } as const;

type SourceRow = Prisma.ExternalSourceGetPayload<{ include: typeof SOURCE_INCLUDE }>;

export function toSource(row: SourceRow): Source {
  const images = jsonOutput(row.images);
  return {
    providerKey: row.provider.key,
    providerName: row.provider.name,
    externalId: row.externalId,
    externalUrl: row.externalUrl,
    providerCategories: row.providerCategories,
    fetchedAt: row.fetchedAt,
    providerUpdatedAt: row.providerUpdatedAt,
    attribution: row.attribution,
    images: Array.isArray(images) ? (images as unknown as SourceImage[]) : [],
    obsoleteAt: row.obsoleteAt,
    createdAt: row.createdAt,
  };
}
