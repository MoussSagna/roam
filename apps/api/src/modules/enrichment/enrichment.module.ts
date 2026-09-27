import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { RoamEnrichmentService } from './roam-enrichment.service.js';

/**
 * The ROAM enrichment of catalog places (ROAM_ENRICHMENT.md): deterministic rules, curated data preserved, quality
 * report. Internal to the data pipeline: no controller, nothing runs at startup, the recommendation engine does not
 * call it.
 */
@Module({
  imports: [CatalogModule],
  providers: [RoamEnrichmentService],
  exports: [RoamEnrichmentService],
})
export class EnrichmentModule {}
