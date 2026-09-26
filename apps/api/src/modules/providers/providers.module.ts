import { Module } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { GooglePlacesAdapter } from './google-places/google-places.adapter.js';
import { GooglePlacesClient } from './google-places/google-places.client.js';
import { PlaceIngestionService } from './place-ingestion.service.js';

/**
 * Provider adapters and the ingestion of their data into the catalog (PROVIDER_ARCHITECTURE.md,
 * GOOGLE_PLACES_PROVIDER.md). No controller: nothing here is reachable over HTTP, and nothing calls a provider at
 * startup. Sync scheduling, cache/TTL and the recommendation engine come later (DATA-6, DATA-7).
 */
@Module({
  imports: [CatalogModule],
  providers: [Clock, GooglePlacesClient, GooglePlacesAdapter, PlaceIngestionService],
  exports: [GooglePlacesAdapter, PlaceIngestionService],
})
export class ProvidersModule {}
