import { type INestApplication, Logger, RequestMethod, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
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

  // The client IP (rate limiting): the TCP peer, unless reverse proxies are declared trusted (RATE_LIMITING.md).
  if (config.http.trustProxy > 0) {
    (app as NestExpressApplication).set('trust proxy', config.http.trustProxy);
  }

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
    SwaggerModule.setup(config.swagger.path, app, documentRateLimit(document));
  }

  app.enableShutdownHooks();
  return config;
}

/** The 429 every rate-limited operation can answer (every route but the health probes — RATE_LIMITING.md). */
const TOO_MANY_REQUESTS = {
  description: 'Rate limit exceeded: retry after the `Retry-After` delay (RATE_LIMITING.md).',
  headers: {
    'Retry-After': {
      description: 'Seconds before a new request is accepted.',
      schema: { type: 'integer', example: 42 },
    },
  },
  content: {
    'application/json': {
      example: {
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests: try again later.',
          details: { retryAfterSeconds: 42 },
        },
      },
    },
  },
};

function documentRateLimit(document: OpenAPIObject): OpenAPIObject {
  for (const [path, item] of Object.entries(document.paths)) {
    if (path.startsWith('/health')) continue;
    for (const operation of Object.values(item)) {
      if (operation && typeof operation === 'object' && 'responses' in operation) {
        (operation as { responses: Record<string, unknown> }).responses['429'] ??=
          TOO_MANY_REQUESTS;
      }
    }
  }
  return document;
}
