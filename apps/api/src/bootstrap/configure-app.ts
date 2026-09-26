import { type INestApplication, Logger, RequestMethod, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { requestLogger } from '../common/logging/request-logger.middleware.js';
import { AppConfigService } from '../config/app-config.service.js';
import { buildCorsOptions } from '../config/cors.js';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

/**
 * HTTP-level setup shared by `main.ts` and the tests, so both run the same application:
 * security headers, CORS, request logging, `/api/v1` routing (health excluded), Swagger, shutdown hooks.
 */
export function configureApp(app: INestApplication): AppConfigService {
  const config = app.get(AppConfigService);

  // Security headers. The CSP is left out while Swagger UI is served (it needs inline scripts); the
  // API itself only returns JSON.
  app.use(helmet({ contentSecurityPolicy: config.swagger.enabled ? false : undefined }));
  app.enableCors(buildCorsOptions(config.cors.origins));
  app.use(requestLogger(new Logger()));

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/database', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });

  if (config.swagger.enabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('ROAM API')
        .setDescription('ROAM backend. Endpoints are documented as their modules are built.')
        .setVersion(API_DEFAULT_VERSION)
        // Sessions: `Authorization: Bearer <token>` (AUTHENTICATION.md).
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(config.swagger.path, app, document);
  }

  app.enableShutdownHooks();
  return config;
}
