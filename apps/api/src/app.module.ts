import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { ExperiencesModule } from './modules/experiences/experiences.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { JourneysModule } from './modules/journeys/journeys.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { UsersModule } from './modules/users/users.module.js';

/**
 * Root module. Cross-cutting behavior is registered here as global providers, so it applies the same
 * way in the running app and in tests: validation (`APP_PIPE`), the error format (`APP_FILTER`) and
 * the success envelope (`APP_INTERCEPTOR`). Domain modules go under `src/modules/` and are imported
 * here as they are built.
 */
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    JourneysModule,
    FavoritesModule,
    ExperiencesModule,
    RecommendationsModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
