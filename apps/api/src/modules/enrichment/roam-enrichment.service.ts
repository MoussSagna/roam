import { isDeepStrictEqual } from 'node:util';

import { Injectable, Logger } from '@nestjs/common';

import { RecordNotFoundError, UniqueConstraintError } from '../../database/persistence-errors.js';
import type { Enrichment } from '../catalog/catalog.types.js';
import { PlaceRepository } from '../catalog/place.repository.js';
import { RoamEnrichmentRepository } from '../catalog/roam-enrichment.repository.js';
import { assessPlaceQuality, type PlaceQuality } from './place-quality.js';
import { deriveRulesEnrichment } from './roam-enrichment.rules.js';

/**
 * - `created` / `updated` / `unchanged`: the rules' enrichment was written, rewritten, or already up to date;
 * - `kept_curated`: the place has a curated (or feedback) enrichment, which the rules never overwrite;
 * - `no_rule`: no rule applies to the place's categories — nothing written (an existing rules enrichment is kept).
 */
export type EnrichmentOutcome = 'created' | 'updated' | 'unchanged' | 'kept_curated' | 'no_rule';

export type PlaceEnrichmentResult = {
  placeId: string;
  outcome: EnrichmentOutcome;
  enrichment: Enrichment | null;
  quality: PlaceQuality;
};

export type EnrichmentReport = Record<EnrichmentOutcome, number> & {
  recommendationReady: number;
  results: PlaceEnrichmentResult[];
};

/**
 * The ROAM enrichment of catalog places (ROAM_ENRICHMENT.md): reads the place, applies the deterministic rules to its
 * ROAM categories, writes through `RoamEnrichmentRepository`, and reports the place's quality. Provider-agnostic: it
 * sees catalog places only (Google, Geoapify and DATA-1 alike), never an adapter or a provider payload.
 *
 * Ownership: provider facts are never written here; a `CURATED` or `USER_FEEDBACK` enrichment is never overwritten
 * (the rewrite is conditioned on `source = ROAM_RULES` in the same statement). Idempotent: an up-to-date enrichment is
 * not rewritten; concurrent calls create one enrichment (unique `placeId`).
 */
@Injectable()
export class RoamEnrichmentService {
  private readonly logger = new Logger('RoamEnrichmentService');

  constructor(
    private readonly places: PlaceRepository,
    private readonly enrichments: RoamEnrichmentRepository,
  ) {}

  /** Enriches one place. Throws `RecordNotFoundError` when the place does not exist. */
  async enrichPlace(placeId: string): Promise<PlaceEnrichmentResult> {
    const place = await this.places.findById(placeId);
    if (!place) throw new RecordNotFoundError('Place');

    const { outcome, enrichment } = await this.apply(
      placeId,
      place.enrichment,
      place.categorySlugs,
    );
    return {
      placeId,
      outcome,
      enrichment,
      quality: assessPlaceQuality({ ...place, enrichment }),
    };
  }

  /** Enriches several places one after the other (e.g. the places of an import report). */
  async enrichPlaces(placeIds: readonly string[]): Promise<EnrichmentReport> {
    const report: EnrichmentReport = {
      created: 0,
      updated: 0,
      unchanged: 0,
      kept_curated: 0,
      no_rule: 0,
      recommendationReady: 0,
      results: [],
    };
    for (const placeId of placeIds) {
      const result = await this.enrichPlace(placeId);
      report[result.outcome] += 1;
      if (result.quality.recommendationReady) report.recommendationReady += 1;
      report.results.push(result);
    }
    this.logger.log(
      `enrichPlaces: ${placeIds.length} places, ${report.created} created, ${report.updated} updated, ` +
        `${report.unchanged} unchanged, ${report.kept_curated} kept curated, ${report.no_rule} without rule, ` +
        `${report.recommendationReady} recommendation-ready`,
    );
    return report;
  }

  private async apply(
    placeId: string,
    existing: Enrichment | null,
    categorySlugs: readonly string[],
    raced = false,
  ): Promise<{ outcome: EnrichmentOutcome; enrichment: Enrichment | null }> {
    if (existing && existing.source !== 'ROAM_RULES')
      return { outcome: 'kept_curated', enrichment: existing };

    const derived = deriveRulesEnrichment(categorySlugs);
    if (!derived) return { outcome: 'no_rule', enrichment: existing };

    if (existing) {
      // jsonb does not keep key order: compared structurally.
      if (isDeepStrictEqual(existing, derived))
        return { outcome: 'unchanged', enrichment: existing };
      if (await this.enrichments.replaceRulesEnrichmentOfPlace(placeId, derived))
        return { outcome: 'updated', enrichment: derived };
      // Curated in between (or removed): decide again on what is there now.
      return this.retry(placeId, categorySlugs, raced);
    }

    try {
      return {
        outcome: 'created',
        enrichment: await this.enrichments.createForPlace(placeId, derived),
      };
    } catch (error) {
      // A concurrent call (or a curator) enriched the place first.
      if (!(error instanceof UniqueConstraintError)) throw error;
      return this.retry(placeId, categorySlugs, raced);
    }
  }

  private async retry(placeId: string, categorySlugs: readonly string[], raced: boolean) {
    if (raced) throw new Error('RoamEnrichmentService: enrichment kept changing concurrently');
    const current = await this.enrichments.findByPlaceId(placeId);
    return this.apply(placeId, current, categorySlugs, true);
  }
}
