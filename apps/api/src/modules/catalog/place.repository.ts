import { Injectable } from '@nestjs/common';

import { lockKeys } from '../../database/advisory-lock.js';
import { jsonInput, type JsonValue } from '../../database/json.js';
import { persist, RecordNotFoundError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ensureProviderId } from '../../database/provider-rows.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PriceLevel } from '../../generated/prisma/enums.js';
import {
  categoryLinks,
  imagesJson,
  PLACE_INCLUDE,
  SOURCE_INCLUDE,
  sourceCreate,
  toPlace,
  toSource,
} from './catalog.mappers.js';
import type { NewPlace, Place, PlaceChange, Source, SourceInput } from './catalog.types.js';

/** The facts a place's **primary** source owns (the source that created it): written on every refresh of that source. */
export type PlaceFacts = {
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  priceLevel: PriceLevel;
  rating: number | null;
  reviewCount: number | null;
};

/**
 * Facts any source may contribute, written only where the place has none yet: never over a curated value, another
 * provider's value or an earlier import (DATA_PERSISTENCE_AND_SYNC.md "Ownership").
 */
export type PlaceFill = {
  description?: string | null;
  website?: string | null;
  openingHours?: JsonValue | null;
  attributes?: JsonValue | null;
  rnbId?: string | null;
};

/** An existing place a new provider record may be (cross-provider deduplication candidate). */
export type PlaceCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rnbId: string | null;
  providerKeys: string[];
};

export type PlaceUpsert = {
  facts: PlaceFacts;
  fill: PlaceFill;
  /** ROAM categories, linked at creation only (then ROAM's). */
  categorySlugs: string[];
  source: SourceInput;
  /**
   * Cross-provider deduplication for a record new to ROAM: candidates within `radiusMeters` or in the same building
   * are given to `decide`, which returns the place to attach the record to, or `null` to create a new place.
   */
  match?: {
    radiusMeters: number;
    lockNames: string[];
    decide: (candidates: PlaceCandidate[]) => { placeId: string | null; rule: string };
  };
};

export type PlaceUpsertOutcome = 'created' | 'matched' | 'updated' | 'unchanged';
export type PlaceUpsertResult = { place: Place; outcome: PlaceUpsertOutcome; rule?: string };

type Tx = Prisma.TransactionClient;
type SourceRow = { id: string; obsoleteAt: Date | null };

const FACT_KEYS = [
  'name',
  'address',
  'city',
  'latitude',
  'longitude',
  'priceLevel',
  'rating',
  'reviewCount',
] as const satisfies readonly (keyof PlaceFacts)[];
const FILL_KEYS = [
  'description',
  'website',
  'openingHours',
  'attributes',
  'rnbId',
] as const satisfies readonly (keyof PlaceFill)[];

/**
 * Places (PLACE.md): provider facts, their categories and provenance. Written by the provider pipeline
 * (adapter → normalization → repository); a place no sync finds any more is deactivated, not deleted.
 */
@Injectable()
export class PlaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Place | null> {
    return persist(async () => {
      const row = await this.prisma.place.findUnique({ where: { id }, include: PLACE_INCLUDE });
      return row && toPlace(row);
    });
  }

  /** The place imported from this provider record — deduplication by provider id first (EXPERIENCE.md). */
  findBySource(providerKey: string, externalId: string): Promise<Place | null> {
    return persist(async () => {
      const source = await this.prisma.externalSource.findFirst({
        where: { entityType: 'PLACE', externalId, provider: { key: providerKey } },
        select: { place: { include: PLACE_INCLUDE } },
      });
      return source?.place ? toPlace(source.place) : null;
    });
  }

  /**
   * Creates the place with its categories and provenance in one write (atomic). A provider record already
   * imported: `UniqueConstraintError`; an unknown category slug: `RecordNotFoundError`.
   */
  create(place: NewPlace): Promise<Place> {
    const { categorySlugs, source, openingHours, attributes, ...fields } = place;
    return persist(async () =>
      toPlace(
        await this.prisma.place.create({
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            attributes: jsonInput(attributes),
            categories: categoryLinks(categorySlugs),
            sources: source ? { create: [sourceCreate(source, 'PLACE')] } : undefined,
          },
          include: PLACE_INCLUDE,
        }),
      ),
    );
  }

  /** Updates provider facts (or `isActive`). Throws `RecordNotFoundError` when the place does not exist. */
  update(id: string, change: PlaceChange): Promise<Place> {
    const { openingHours, attributes, ...fields } = change;
    return persist(async () =>
      toPlace(
        await this.prisma.place.update({
          where: { id },
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            attributes: jsonInput(attributes),
          },
          include: PLACE_INCLUDE,
        }),
      ),
    );
  }

  /**
   * A provider refresh (DATA-2): updates the provider facts and that provider record's provenance (`fetchedAt`,
   * URL, classification) in one write (atomic). Never touches the ROAM enrichment, categories or other sources.
   * Throws `RecordNotFoundError` when the place does not exist.
   */
  updateFromSource(id: string, change: PlaceChange, source: SourceInput): Promise<Place> {
    const { openingHours, attributes, ...fields } = change;
    return persist(async () => {
      // Nested writes filter on scalars only: resolve the provider (an immutable row) first.
      const provider = await this.prisma.provider.findUnique({
        where: { key: source.provider.key },
        select: { id: true },
      });
      if (!provider) throw new RecordNotFoundError('Provider');
      return toPlace(
        await this.prisma.place.update({
          where: { id },
          data: {
            ...fields,
            openingHours: jsonInput(openingHours),
            attributes: jsonInput(attributes),
            sources: {
              updateMany: {
                where: {
                  entityType: 'PLACE',
                  externalId: source.externalId,
                  providerId: provider.id,
                },
                data: {
                  externalUrl: source.externalUrl ?? null,
                  providerCategories: source.providerCategories ?? [],
                  confidence: source.confidence ?? null,
                  fetchedAt: source.fetchedAt,
                  providerUpdatedAt: source.providerUpdatedAt ?? null,
                },
              },
            },
          },
          include: PLACE_INCLUDE,
        }),
      );
    });
  }

  /** The provenance rows of a place, oldest (primary) first. */
  sourcesOf(placeId: string): Promise<Source[]> {
    return persist(async () =>
      (
        await this.prisma.externalSource.findMany({
          where: { placeId },
          include: SOURCE_INCLUDE,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      ).map(toSource),
    );
  }

  /**
   * The DATA-6 write path of every provider place, in **one transaction**:
   *
   * 1. advisory locks on the provider record, and (for a new record) on its building and name — concurrent imports of
   *    the same record, building or name are serialized, so none of them creates a duplicate;
   * 2. known provider record → refresh: the primary source's facts, empty fields filled, that source's provenance,
   *    `isActive` recomputed from every source; `unchanged` when nothing but `fetchedAt` moved;
   * 3. new record → `match.decide` among nearby / same-building places: attach the source to that place (`matched`) or
   *    create the place with its categories and provenance (`created`).
   *
   * Never touches the ROAM enrichment, the categories of an existing place, or other providers' sources.
   */
  upsertFromSource(input: PlaceUpsert): Promise<PlaceUpsertResult> {
    const { source } = input;
    return persist(async () => {
      const providerId = await ensureProviderId(this.prisma, source.provider);
      return this.prisma.$transaction(async (tx) => {
        const locks = [`place-source:${source.provider.key}:${source.externalId}`];
        if (input.match) {
          if (input.fill.rnbId) locks.push(`place-rnb:${input.fill.rnbId}`);
          for (const name of input.match.lockNames) locks.push(`place-name:${name}`);
        }
        await lockKeys(tx, locks);

        const existing = await tx.externalSource.findUnique({
          where: {
            providerId_entityType_externalId: {
              providerId,
              entityType: 'PLACE',
              externalId: source.externalId,
            },
          },
          select: { id: true, placeId: true },
        });
        if (existing?.placeId) return this.refreshInTx(tx, existing.placeId, existing.id, input);

        if (input.match) {
          const candidates = await this.candidatesInTx(tx, input);
          const decision = input.match.decide(candidates);
          if (decision.placeId) {
            const place = await this.attachInTx(tx, decision.placeId, providerId, input);
            return { place, outcome: 'matched' as const, rule: decision.rule };
          }
        }

        const { categorySlugs, facts, fill } = input;
        const row = await tx.place.create({
          data: {
            ...facts,
            description: fill.description ?? null,
            website: fill.website ?? null,
            rnbId: fill.rnbId ?? null,
            openingHours: jsonInput(fill.openingHours ?? null),
            attributes: jsonInput(fill.attributes ?? null),
            isActive: !source.obsoleteAt,
            categories: categoryLinks(categorySlugs),
            sources: { create: [sourceCreate(source, 'PLACE')] },
          },
          include: PLACE_INCLUDE,
        });
        return { place: toPlace(row), outcome: 'created' as const };
      });
    });
  }

  private async candidatesInTx(tx: Tx, input: PlaceUpsert): Promise<PlaceCandidate[]> {
    const { latitude, longitude } = input.facts;
    const radius = input.match!.radiusMeters;
    const dLat = radius / 111_320;
    const dLon = radius / (111_320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
    const rows = await tx.place.findMany({
      where: {
        OR: [
          {
            latitude: { gte: latitude - dLat, lte: latitude + dLat },
            longitude: { gte: longitude - dLon, lte: longitude + dLon },
          },
          ...(input.fill.rnbId ? [{ rnbId: input.fill.rnbId }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        rnbId: true,
        sources: { select: { provider: { select: { key: true } } } },
      },
      take: 200,
    });
    return rows.map(({ sources, ...row }) => ({
      ...row,
      providerKeys: [...new Set(sources.map(({ provider }) => provider.key))],
    }));
  }

  /** A second provider's record of an existing place: its provenance, and only the facts the place lacks. */
  private async attachInTx(tx: Tx, placeId: string, providerId: string, input: PlaceUpsert) {
    const { source } = input;
    await tx.externalSource.create({
      data: {
        ...sourceCreateData(source),
        entityType: 'PLACE',
        externalId: source.externalId,
        provider: { connect: { id: providerId } },
        place: { connect: { id: placeId } },
      },
    });
    const current = await tx.place.findUniqueOrThrow({ where: { id: placeId } });
    const sources = await tx.externalSource.findMany({
      where: { placeId },
      select: { id: true, obsoleteAt: true },
    });
    await tx.place.update({
      where: { id: placeId },
      data: { ...fillData(current, input.fill), isActive: isActive(sources) },
    });
    return toPlace(
      await tx.place.findUniqueOrThrow({ where: { id: placeId }, include: PLACE_INCLUDE }),
    );
  }

  private async refreshInTx(
    tx: Tx,
    placeId: string,
    sourceId: string,
    input: PlaceUpsert,
  ): Promise<PlaceUpsertResult> {
    const { source } = input;
    const current = await tx.place.findUniqueOrThrow({ where: { id: placeId } });
    const sources = await tx.externalSource.findMany({
      where: { placeId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const mine = sources.find(({ id }) => id === sourceId)!;
    const isPrimary = sources[0].id === sourceId;

    const data: Record<string, unknown> = { ...fillData(current, input.fill) };
    if (isPrimary) {
      for (const key of FACT_KEYS) {
        if (current[key] !== input.facts[key]) data[key] = input.facts[key];
      }
    }
    // Still obsolete: keep the first time it was declared so.
    const obsoleteAt = source.obsoleteAt ? (mine.obsoleteAt ?? source.obsoleteAt) : null;
    const sourceData = {
      externalUrl: source.externalUrl ?? null,
      providerCategories: source.providerCategories ?? [],
      confidence: source.confidence ?? null,
      providerUpdatedAt: source.providerUpdatedAt ?? null,
      attribution: source.attribution ?? null,
      obsoleteAt,
      ...(source.images !== undefined ? { images: jsonInput(imagesJson(source.images)) } : {}),
    };
    const sourceChanged =
      mine.externalUrl !== sourceData.externalUrl ||
      JSON.stringify(mine.providerCategories) !== JSON.stringify(sourceData.providerCategories) ||
      mine.confidence !== sourceData.confidence ||
      mine.providerUpdatedAt?.getTime() !== sourceData.providerUpdatedAt?.getTime() ||
      mine.attribution !== sourceData.attribution ||
      (mine.obsoleteAt === null) !== (obsoleteAt === null) ||
      (source.images !== undefined &&
        JSON.stringify(mine.images ?? null) !== JSON.stringify(imagesJson(source.images) ?? null));

    await tx.externalSource.update({
      where: { id: sourceId },
      data: { ...sourceData, fetchedAt: source.fetchedAt },
    });
    const active = isActive(
      sources.map((row) => (row.id === sourceId ? { id: row.id, obsoleteAt } : row)),
    );
    if (active !== current.isActive) data.isActive = active;

    const changed = sourceChanged || Object.keys(data).length > 0;
    if (Object.keys(data).length > 0) await tx.place.update({ where: { id: placeId }, data });
    const row = await tx.place.findUniqueOrThrow({
      where: { id: placeId },
      include: PLACE_INCLUDE,
    });
    return { place: toPlace(row), outcome: changed ? 'updated' : 'unchanged' };
  }
}

/** A place is active while at least one of its sources is not declared obsolete (DATA-6 "Obsolete data"). */
function isActive(sources: SourceRow[]): boolean {
  return sources.some(({ obsoleteAt }) => obsoleteAt === null);
}

/** The fill-only fields the place does not have yet. */
function fillData(current: Record<string, unknown>, fill: PlaceFill): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of FILL_KEYS) {
    const value = fill[key];
    if (value === undefined || value === null) continue;
    if (current[key] !== null && current[key] !== undefined) continue;
    data[key] = key === 'openingHours' || key === 'attributes' ? jsonInput(value) : value;
  }
  return data;
}

/** An `ExternalSource` row's provenance columns (the relations are set by the caller). */
function sourceCreateData(source: SourceInput) {
  const data: Partial<ReturnType<typeof sourceCreate>> = sourceCreate(source, 'PLACE');
  delete data.provider;
  return data as Omit<ReturnType<typeof sourceCreate>, 'provider'>;
}
