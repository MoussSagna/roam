import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { Audience, Moment } from '../../generated/prisma/enums.js';
import { decimalOutput, jsonInput } from '../json.js';
import { catalogId } from './catalog-id.js';
import type {
  CatalogPlan,
  PlannedEnrichment,
  PlannedExperience,
  PlannedPlace,
} from './catalog-plan.js';

/**
 * DATA-1: writes the canonical catalog planned from the mobile mocks (`catalog-plan.ts`) — idempotent, in one
 * transaction, and only over the rows the migration owns (apidocs/DATA_1_MIGRATION_REPORT.md → "Ownership").
 *
 * - Provenance: every migrated place and experience has an `ExternalSource` row of the internal provider
 *   `mobile_mock_migration` whose `externalId` is the mobile id. That row is how the seed recognizes its own records;
 *   no external provider (Google Places, Ticketmaster, data.gouv.fr) is involved or imitated.
 * - Created with a deterministic id (`catalogId`); found again through its provenance row.
 * - Rewritten only when the planned values differ, and only if nobody changed the record since the seed wrote it:
 *   the seed stamps `updatedAt` and the provenance `fetchedAt` with the same instant, so a later `updatedAt` means
 *   an edit made elsewhere — that record is skipped and reported, never overwritten.
 * - Never deletes nor deactivates anything; categories are a shared vocabulary: created when missing, never changed.
 * - All or nothing: any failure rolls the whole run back.
 */

export const MIGRATION_PROVIDER = {
  key: 'mobile_mock_migration',
  name: 'ROAM mobile mock data (DATA-1 migration, internal)',
} as const;

export type Outcome = 'created' | 'updated' | 'unchanged' | 'skipped';
export type OutcomeCounts = Record<Outcome, number>;

export type SeedResult = {
  categories: OutcomeCounts;
  places: OutcomeCounts;
  experiences: OutcomeCounts;
  /** Records left as they are because they were changed outside the seed. */
  skipped: { entity: 'place' | 'experience'; mockId: string; reason: string }[];
};

/** A row with the id the migration would use exists, but the migration does not own it. */
export class SeedConflictError extends Error {
  constructor(entity: string, id: string) {
    super(
      `A ${entity} with id ${id} already exists without "${MIGRATION_PROVIDER.key}" provenance: ` +
        'the migration does not overwrite records it does not own.',
    );
    this.name = 'SeedConflictError';
  }
}

type Tx = Prisma.TransactionClient;

const REASON_MODIFIED = 'changed outside the seed since the last migration run: left unchanged';

const PLACE_ROW = {
  categories: { select: { category: { select: { slug: true } } } },
  enrichment: true,
} as const satisfies Prisma.PlaceInclude;

const EXPERIENCE_ROW = {
  categories: { select: { category: { select: { slug: true } } } },
  places: { orderBy: { position: 'asc' }, select: { placeId: true } },
  enrichment: true,
} as const satisfies Prisma.ExperienceInclude;

type EnrichmentRow = Prisma.RoamEnrichmentGetPayload<object>;

const counts = (): OutcomeCounts => ({ created: 0, updated: 0, unchanged: 0, skipped: 0 });

export async function seedCatalog(
  prisma: PrismaClient,
  plan: CatalogPlan,
  options: { now?: Date } = {},
): Promise<SeedResult> {
  const now = options.now ?? new Date();
  return prisma.$transaction(
    async (tx) => {
      const result: SeedResult = {
        categories: counts(),
        places: counts(),
        experiences: counts(),
        skipped: [],
      };
      const provider = await tx.provider.upsert({
        where: { key: MIGRATION_PROVIDER.key },
        create: { id: catalogId('provider', MIGRATION_PROVIDER.key), ...MIGRATION_PROVIDER },
        update: {},
      });

      const categoryIds = new Map<string, string>();
      for (const category of plan.categories) {
        const existing = await tx.category.findUnique({ where: { slug: category.slug } });
        const row = existing ?? (await tx.category.create({ data: category }));
        categoryIds.set(row.slug, row.id);
        result.categories[existing ? 'unchanged' : 'created'] += 1;
      }
      const writer = new CatalogWriter(tx, provider.id, categoryIds, now);

      for (const place of plan.places) {
        const outcome = await writer.place(place);
        result.places[outcome] += 1;
        if (outcome === 'skipped') {
          result.skipped.push({
            entity: 'place',
            mockId: place.mockIds[0],
            reason: REASON_MODIFIED,
          });
        }
      }
      for (const experience of plan.experiences) {
        const outcome = await writer.experience(experience);
        result.experiences[outcome] += 1;
        if (outcome === 'skipped') {
          result.skipped.push({
            entity: 'experience',
            mockId: experience.mockId,
            reason: REASON_MODIFIED,
          });
        }
      }
      return result;
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}

class CatalogWriter {
  constructor(
    private readonly tx: Tx,
    private readonly providerId: string,
    private readonly categoryIds: Map<string, string>,
    private readonly now: Date,
  ) {}

  private categoryId(slug: string): string {
    const id = this.categoryIds.get(slug);
    if (id === undefined) throw new Error(`Category "${slug}" is not part of the plan`);
    return id;
  }

  private findSource(entityType: 'PLACE' | 'EXPERIENCE', externalId: string) {
    return this.tx.externalSource.findUnique({
      where: {
        providerId_entityType_externalId: { providerId: this.providerId, entityType, externalId },
      },
    });
  }

  /** Creates the provenance rows that are missing and stamps them all with this run. */
  private async stampSources(
    target: { placeId: string } | { experienceId: string },
    ids: string[],
  ) {
    const entityType = 'placeId' in target ? 'PLACE' : 'EXPERIENCE';
    for (const externalId of ids) {
      await this.tx.externalSource.upsert({
        where: {
          providerId_entityType_externalId: { providerId: this.providerId, entityType, externalId },
        },
        create: {
          providerId: this.providerId,
          entityType,
          externalId,
          fetchedAt: this.now,
          ...target,
        },
        update: { fetchedAt: this.now },
      });
    }
  }

  private async writeEnrichment(
    target: { placeId: string } | { experienceId: string },
    planned: PlannedEnrichment | null,
  ) {
    if (!planned) {
      await this.tx.roamEnrichment.deleteMany({ where: target });
      return;
    }
    const data = enrichmentData(planned, this.now);
    await this.tx.roamEnrichment.upsert({
      where: target,
      create: { ...target, ...data },
      update: data,
    });
  }

  async place(planned: PlannedPlace): Promise<Outcome> {
    const { id, mockIds, categorySlugs, enrichment, ...fields } = planned;
    const source = await this.findSource('PLACE', mockIds[0]);
    if (!source) {
      if (await this.tx.place.findUnique({ where: { id } }))
        throw new SeedConflictError('place', id);
      await this.tx.place.create({
        data: {
          id,
          ...fields,
          updatedAt: this.now,
          categories: {
            create: categorySlugs.map((slug) => ({ categoryId: this.categoryId(slug) })),
          },
          enrichment: enrichment ? { create: enrichmentData(enrichment, this.now) } : undefined,
        },
      });
      await this.stampSources({ placeId: id }, mockIds);
      return 'created';
    }

    const placeId = source.placeId ?? id;
    const row = await this.tx.place.findUniqueOrThrow({
      where: { id: placeId },
      include: PLACE_ROW,
    });
    if (changedSince(source.fetchedAt, row, row.enrichment)) return 'skipped';

    const sourceCount = await this.tx.externalSource.count({
      where: { providerId: this.providerId, placeId, externalId: { in: mockIds } },
    });
    const same =
      sourceCount === mockIds.length &&
      row.name === fields.name &&
      row.description === fields.description &&
      row.address === fields.address &&
      row.city === fields.city &&
      row.latitude === fields.latitude &&
      row.longitude === fields.longitude &&
      row.priceLevel === fields.priceLevel &&
      sameSet(
        row.categories.map(({ category }) => category.slug),
        categorySlugs,
      ) &&
      sameEnrichment(row.enrichment, enrichment);
    if (same) return 'unchanged';

    await this.tx.place.update({
      where: { id: placeId },
      data: { ...fields, updatedAt: this.now },
    });
    await this.tx.placeCategory.deleteMany({ where: { placeId } });
    await this.tx.placeCategory.createMany({
      data: categorySlugs.map((slug) => ({ placeId, categoryId: this.categoryId(slug) })),
    });
    await this.writeEnrichment({ placeId }, enrichment);
    await this.stampSources({ placeId }, mockIds);
    return 'updated';
  }

  async experience(planned: PlannedExperience): Promise<Outcome> {
    const { id, mockId, categorySlugs, placeIds, enrichment, ...fields } = planned;
    const source = await this.findSource('EXPERIENCE', mockId);
    if (!source) {
      if (await this.tx.experience.findUnique({ where: { id } })) {
        throw new SeedConflictError('experience', id);
      }
      await this.tx.experience.create({
        data: {
          id,
          ...fields,
          updatedAt: this.now,
          categories: {
            create: categorySlugs.map((slug) => ({ categoryId: this.categoryId(slug) })),
          },
          places: { create: placeIds.map((placeId, position) => ({ placeId, position })) },
          enrichment: { create: enrichmentData(enrichment, this.now) },
        },
      });
      await this.stampSources({ experienceId: id }, [mockId]);
      return 'created';
    }

    const experienceId = source.experienceId ?? id;
    const row = await this.tx.experience.findUniqueOrThrow({
      where: { id: experienceId },
      include: EXPERIENCE_ROW,
    });
    if (changedSince(source.fetchedAt, row, row.enrichment)) return 'skipped';

    const same =
      row.title === fields.title &&
      row.description === fields.description &&
      row.address === fields.address &&
      row.city === fields.city &&
      row.latitude === fields.latitude &&
      row.longitude === fields.longitude &&
      row.priceLevel === fields.priceLevel &&
      decimalOutput(row.priceMin) === fields.priceMin &&
      decimalOutput(row.priceMax) === fields.priceMax &&
      row.currency === fields.currency &&
      row.rating === fields.rating &&
      row.reviewCount === fields.reviewCount &&
      sameSet(
        row.categories.map(({ category }) => category.slug),
        categorySlugs,
      ) &&
      sameList(
        row.places.map((place) => place.placeId),
        placeIds,
      ) &&
      sameEnrichment(row.enrichment, enrichment);
    if (same) return 'unchanged';

    await this.tx.experience.update({
      where: { id: experienceId },
      data: { ...fields, updatedAt: this.now },
    });
    await this.tx.experienceCategory.deleteMany({ where: { experienceId } });
    await this.tx.experienceCategory.createMany({
      data: categorySlugs.map((slug) => ({ experienceId, categoryId: this.categoryId(slug) })),
    });
    await this.tx.experiencePlace.deleteMany({ where: { experienceId } });
    await this.tx.experiencePlace.createMany({
      data: placeIds.map((placeId, position) => ({ experienceId, placeId, position })),
    });
    await this.writeEnrichment({ experienceId }, enrichment);
    await this.stampSources({ experienceId }, [mockId]);
    return 'updated';
  }
}

/**
 * The whole enrichment row belongs to the migration: the ROAM fields the mocks do not carry are written empty /
 * `UNKNOWN` (never inferred).
 */
function enrichmentData(planned: PlannedEnrichment, now: Date) {
  return {
    atmosphere: [] as string[],
    energyLevel: 'UNKNOWN' as const,
    suitableFor: [] as Audience[],
    bestMoments: [] as Moment[],
    tags: planned.tags,
    estimatedDurationMin: planned.estimatedDurationMin,
    durationIsDerived: planned.durationIsDerived,
    source: planned.source,
    confidence: jsonInput(planned.confidence),
    updatedAt: now,
  };
}

function changedSince(stamp: Date, ...rows: ({ updatedAt: Date } | null)[]): boolean {
  return rows.some((row) => row !== null && row.updatedAt.getTime() > stamp.getTime());
}

function sameEnrichment(row: EnrichmentRow | null, planned: PlannedEnrichment | null): boolean {
  if (row === null || planned === null) return row === null && planned === null;
  return (
    row.atmosphere.length === 0 &&
    row.energyLevel === 'UNKNOWN' &&
    row.suitableFor.length === 0 &&
    row.bestMoments.length === 0 &&
    sameList(row.tags, planned.tags) &&
    row.estimatedDurationMin === planned.estimatedDurationMin &&
    row.durationIsDerived === planned.durationIsDerived &&
    row.source === planned.source &&
    stableJson(row.confidence) === stableJson(planned.confidence)
  );
}

function sameList<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameSet<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/** JSON with sorted keys: PostgreSQL `jsonb` does not keep the key order of what was written. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );
}
