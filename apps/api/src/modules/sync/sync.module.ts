import { Module } from '@nestjs/common';

import { Clock } from '../../common/clock.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { ProviderRateLimiter } from './provider-rate-limiter.js';
import { Sleeper } from './sleeper.js';
import { SyncJobs } from './sync-jobs.js';
import { SyncRunRepository } from './sync-run.repository.js';
import { SyncService } from './sync.service.js';

/**
 * Persistence & synchronization (DATA-6, DATA_PERSISTENCE_AND_SYNC.md): the generic orchestrator, its run journal,
 * provider pacing and the named jobs. No controller and no scheduler: runs are started explicitly (`pnpm sync`), so
 * nothing calls a provider at startup.
 */
@Module({
  imports: [CatalogModule, ProvidersModule],
  providers: [Clock, Sleeper, ProviderRateLimiter, SyncRunRepository, SyncService, SyncJobs],
  exports: [SyncService, SyncJobs, SyncRunRepository],
})
export class SyncModule {}
