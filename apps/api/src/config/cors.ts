import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * CORS only concerns browsers (Expo web, the future web app): native mobile apps and server-to-server
 * calls send no `Origin` and are not affected. Only the origins listed in `CORS_ORIGINS` are allowed —
 * none when it is empty (the production default until domains are known). Never `*`.
 */
export function buildCorsOptions(allowedOrigins: readonly string[]): CorsOptions {
  const allowed = new Set(allowedOrigins);
  return {
    origin: (origin, callback) => callback(null, origin === undefined || allowed.has(origin)),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
    maxAge: 600,
  };
}
