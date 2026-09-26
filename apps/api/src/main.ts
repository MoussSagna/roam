import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { API_DEFAULT_VERSION, API_PREFIX, configureApp } from './bootstrap/configure-app.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppConfigService).logging.levels);
  // Logs were buffered until the configured levels were known: release them now, so nothing is lost
  // if the startup fails later (e.g. the database in production).
  app.flushLogs();
  const config = configureApp(app);

  await app.listen(config.app.port);

  // What is running and how it is configured — never a secret, only whether it is set.
  const logger = new Logger('Bootstrap');
  logger.log(
    `ROAM API listening on port ${config.app.port} (${config.app.env}) — ` +
      `/${API_PREFIX}/v${API_DEFAULT_VERSION}, /health` +
      (config.swagger.enabled ? `, /${config.swagger.path}` : ''),
  );
  logger.log(
    `CORS origins: ${config.cors.origins.length ? config.cors.origins.join(', ') : 'none (browsers blocked)'}; ` +
      `providers configured: Google Places ${config.providers.googlePlacesApiKey ? 'yes' : 'no'}, ` +
      `Ticketmaster ${config.providers.ticketmasterApiKey ? 'yes' : 'no'}`,
  );
}

try {
  await bootstrap();
} catch (error) {
  // Startup failures (configuration, database in production): one clear line, then a non-zero exit.
  Logger.flush();
  new Logger('Bootstrap').error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
