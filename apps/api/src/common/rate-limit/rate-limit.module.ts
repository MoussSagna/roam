import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppConfigService } from '../../config/app-config.service.js';
import { Clock } from '../clock.js';
import { InMemoryRateLimitStore } from './in-memory-rate-limit.store.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { rateLimitOptions } from './rate-limit.options.js';

/** The store and its clock, in a module of their own so the throttler options factory can inject them. */
@Module({
  providers: [Clock, InMemoryRateLimitStore],
  exports: [InMemoryRateLimitStore],
})
export class RateLimitStoreModule {}

/**
 * Rate limiting (RATE_LIMITING.md): `@nestjs/throttler` (the choice planned in AUTHENTICATION.md) with ROAM's tiers,
 * keys and in-memory store, and the `RateLimitGuard` as a global guard. Imported by `AppModule` **before** `AuthModule`,
 * so its guard runs before the AuthGuard (global guards run in registration order) — checked by the tests.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RateLimitStoreModule],
      inject: [AppConfigService, InMemoryRateLimitStore],
      useFactory: rateLimitOptions,
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}
