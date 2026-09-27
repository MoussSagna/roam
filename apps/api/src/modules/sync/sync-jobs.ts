import { Injectable } from '@nestjs/common';

import { ExternalSourceRepository } from '../catalog/external-source.repository.js';
import { basilicPlacesJob } from '../providers/basilic/basilic.jobs.js';
import { BasilicClient } from '../providers/basilic/basilic.client.js';
import { DataEsAdapter } from '../providers/data-es/data-es.adapter.js';
import { DataEsClient } from '../providers/data-es/data-es.client.js';
import { dataEsPlacesJob } from '../providers/data-es/data-es.jobs.js';
import {
  DatatourismeEventAdapter,
  DatatourismePlaceAdapter,
} from '../providers/datatourisme/datatourisme.adapter.js';
import { DatatourismeClient } from '../providers/datatourisme/datatourisme.client.js';
import {
  datatourismeEventsJob,
  datatourismePlacesJob,
} from '../providers/datatourisme/datatourisme.jobs.js';
import { GeoapifyAdapter } from '../providers/geoapify/geoapify.adapter.js';
import { GooglePlacesAdapter } from '../providers/google-places/google-places.adapter.js';
import { TicketmasterAdapter } from '../providers/ticketmaster/ticketmaster.adapter.js';
import { nearbyEventsJob, nearbyPlacesJob, stalePlacesJob, staleEventsJob } from './jobs.js';
import type { SyncJob } from './sync.types.js';

/** MVP scope (DATA_FOUNDATION.md): Paris and nearby areas — never a national import. */
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const PETITE_COURONNE = ['75', '92', '93', '94'];
const STALE_BATCH = 100;

/**
 * The named sync jobs (DATA_PERSISTENCE_AND_SYNC.md "Provider-specific strategy"): what `pnpm sync <job>` can run. All
 * are built from the generic job types — one per provider and scope, no per-provider sync service.
 */
@Injectable()
export class SyncJobs {
  private readonly jobs: Record<string, () => SyncJob>;

  constructor(
    google: GooglePlacesAdapter,
    geoapify: GeoapifyAdapter,
    ticketmaster: TicketmasterAdapter,
    datatourisme: DatatourismeClient,
    datatourismePlaces: DatatourismePlaceAdapter,
    datatourismeEvents: DatatourismeEventAdapter,
    basilic: BasilicClient,
    dataEs: DataEsClient,
    dataEsPlaces: DataEsAdapter,
    sources: ExternalSourceRepository,
  ) {
    const paris = { name: 'paris', near: { ...PARIS, radiusMeters: 10_000 } };
    this.jobs = {
      'google_places:places:paris': () =>
        nearbyPlacesJob('google_places:places:paris', google, { ...PARIS, radiusMeters: 2_000 }),
      'geoapify:places:paris': () =>
        nearbyPlacesJob('geoapify:places:paris', geoapify, { ...PARIS, radiusMeters: 2_000 }),
      'ticketmaster:events:paris': () =>
        nearbyEventsJob('ticketmaster:events:paris', ticketmaster, {
          ...PARIS,
          radiusMeters: 10_000,
          maxResults: 50,
        }),
      'datatourisme:places:paris': () => datatourismePlacesJob(datatourisme, paris),
      'datatourisme:events:paris': () => datatourismeEventsJob(datatourisme, paris),
      'basilic:places:petite-couronne': () =>
        basilicPlacesJob(basilic, { name: 'petite-couronne', departments: PETITE_COURONNE }),
      'data_es:places:paris': () =>
        dataEsPlacesJob(dataEs, { name: 'paris', departments: ['75'], freeAccessOnly: true }),
      'google_places:places:refresh-stale': () => stalePlacesJob(google, sources, STALE_BATCH),
      'geoapify:places:refresh-stale': () => stalePlacesJob(geoapify, sources, STALE_BATCH),
      'ticketmaster:events:refresh-stale': () => staleEventsJob(ticketmaster, sources, STALE_BATCH),
      'datatourisme:places:refresh-stale': () =>
        stalePlacesJob(datatourismePlaces, sources, STALE_BATCH),
      'datatourisme:events:refresh-stale': () =>
        staleEventsJob(datatourismeEvents, sources, STALE_BATCH),
      'data_es:places:refresh-stale': () => stalePlacesJob(dataEsPlaces, sources, STALE_BATCH),
    };
  }

  names(): string[] {
    return Object.keys(this.jobs).sort();
  }

  get(name: string): SyncJob {
    const build = this.jobs[name];
    if (!build) throw new RangeError(`unknown sync job "${name}"`);
    return build();
  }
}
