import { Injectable } from '@nestjs/common';

import { jsonInput } from '../../database/json.js';
import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import { toEnrichment } from './catalog.mappers.js';
import type { Enrichment } from './catalog.types.js';

/**
 * Writes of the ROAM enrichment of a place (`RoamEnrichment`, ROAM_ENRICHMENT.md). One enrichment per place (unique
 * `placeId`); reads also come with the place (`PlaceRepository`). Experiences' enrichments are not written here.
 */
@Injectable()
export class RoamEnrichmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPlaceId(placeId: string): Promise<Enrichment | null> {
    return persist(async () =>
      toEnrichment(await this.prisma.roamEnrichment.findUnique({ where: { placeId } })),
    );
  }

  /**
   * Creates the enrichment of a place. Already enriched: `UniqueConstraintError`; unknown place:
   * `ForeignKeyConstraintError` (`missingReference`).
   */
  createForPlace(placeId: string, enrichment: Enrichment): Promise<Enrichment> {
    const { confidence, ...fields } = enrichment;
    return persist(async () =>
      toEnrichment(
        await this.prisma.roamEnrichment.create({
          data: { ...fields, confidence: jsonInput(confidence), placeId },
        }),
      )!,
    );
  }

  /**
   * Replaces the enrichment of a place **only while its source is still `ROAM_RULES`**, in one conditional write: a
   * curated or feedback enrichment (even one written concurrently) is never overwritten. `false` when nothing was
   * written (no enrichment, or not a rules one).
   */
  replaceRulesEnrichmentOfPlace(
    placeId: string,
    enrichment: Omit<Enrichment, 'source'>,
  ): Promise<boolean> {
    const { confidence, ...fields } = enrichment;
    return persist(async () => {
      const { count } = await this.prisma.roamEnrichment.updateMany({
        where: { placeId, source: 'ROAM_RULES' },
        data: { ...fields, confidence: jsonInput(confidence) },
      });
      return count > 0;
    });
  }
}
