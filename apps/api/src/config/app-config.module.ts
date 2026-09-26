import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service.js';
import { validateEnvironment } from './environment.js';

/**
 * Loads `.env` (local development only; real environments inject variables), validates it at startup
 * and exposes `AppConfigService` everywhere. Tests set their variables themselves and ignore `.env`.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnvironment,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
