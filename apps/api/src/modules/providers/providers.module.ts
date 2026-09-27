import { Module } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { BasilicClient } from './basilic/basilic.client.js';
import { DataEsAdapter } from './data-es/data-es.adapter.js';
import { DataEsClient } from './data-es/data-es.client.js';
import {
  DatatourismeEventAdapter,
  DatatourismePlaceAdapter,
} from './datatourisme/datatourisme.adapter.js';
import { DatatourismeClient } from './datatourisme/datatourisme.client.js';
import { EventIngestionService } from './event-ingestion.service.js';
import { GeoapifyAdapter } from './geoapify/geoapify.adapter.js';
import { GeoapifyClient } from './geoapify/geoapify.client.js';
import { GooglePlacesAdapter } from './google-places/google-places.adapter.js';
import { GooglePlacesClient } from './google-places/google-places.client.js';
import { PlaceIngestionService } from './place-ingestion.service.js';
import { TicketmasterAdapter } from './ticketmaster/ticketmaster.adapter.js';
import { TicketmasterClient } from './ticketmaster/ticketmaster.client.js';

/**
 * Provider adapters and the ingestion of their data into the catalog: places (PROVIDER_ARCHITECTURE.md,
 * GOOGLE_PLACES_PROVIDER.md, GEOAPIFY_PROVIDER.md), events (TICKETMASTER_PROVIDER.md) and the open data sources
 * DATAtourisme, Basilic, Data ES (DATA_PERSISTENCE_AND_SYNC.md). No controller: nothing here is reachable over HTTP,
 * and nothing calls a provider at startup. Synchronization is the SyncModule's (DATA-6); recommendations are DATA-7.
 */
@Module({
  imports: [CatalogModule],
  providers: [
    Clock,
    GooglePlacesClient,
    GooglePlacesAdapter,
    GeoapifyClient,
    GeoapifyAdapter,
    PlaceIngestionService,
    TicketmasterClient,
    TicketmasterAdapter,
    EventIngestionService,
    DatatourismeClient,
    DatatourismePlaceAdapter,
    DatatourismeEventAdapter,
    BasilicClient,
    DataEsClient,
    DataEsAdapter,
  ],
  exports: [
    GooglePlacesAdapter,
    GeoapifyAdapter,
    PlaceIngestionService,
    TicketmasterAdapter,
    EventIngestionService,
    DatatourismeClient,
    DatatourismePlaceAdapter,
    DatatourismeEventAdapter,
    BasilicClient,
    DataEsClient,
    DataEsAdapter,
  ],
})
export class ProvidersModule {}
