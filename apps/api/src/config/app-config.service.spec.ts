import type { ConfigService } from '@nestjs/config';

import { AppConfigService, logLevelsUpTo, parseOrigins } from './app-config.service.js';
import { type EnvironmentVariables, LogLevel, validateEnvironment } from './environment.js';

function configFor(raw: Record<string, string>): AppConfigService {
  const env = validateEnvironment({ DATABASE_URL: 'postgresql://u:p@h:5432/db', ...raw });
  const stub = { get: (key: keyof EnvironmentVariables) => env[key] };
  return new AppConfigService(stub as unknown as ConfigService<EnvironmentVariables, true>);
}

describe('AppConfigService', () => {
  it('parses CORS_ORIGINS into a clean list', () => {
    expect(parseOrigins(' http://a.test , ,http://b.test ')).toEqual([
      'http://a.test',
      'http://b.test',
    ]);
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it('enables the log levels up to the threshold', () => {
    expect(logLevelsUpTo(LogLevel.Warn)).toEqual(['fatal', 'error', 'warn']);
  });

  it('development: database optional at startup, Swagger on, debug logs', () => {
    const config = configFor({ NODE_ENV: 'development' });

    expect(config.app.isProduction).toBe(false);
    expect(config.database.requiredAtStartup).toBe(false);
    expect(config.swagger.enabled).toBe(true);
    expect(config.logging.levels).toContain('debug');
  });

  it('production: database required at startup, Swagger off, no debug logs, no CORS origin by default', () => {
    const config = configFor({ NODE_ENV: 'production' });

    expect(config.database.requiredAtStartup).toBe(true);
    expect(config.swagger.enabled).toBe(false);
    expect(config.logging.levels).not.toContain('debug');
    expect(config.cors.origins).toEqual([]);
  });

  it('explicit settings win over the environment defaults', () => {
    const config = configFor({
      NODE_ENV: 'production',
      SWAGGER_ENABLED: 'true',
      LOG_LEVEL: 'error',
    });

    expect(config.swagger.enabled).toBe(true);
    expect(config.logging.levels).toEqual(['fatal', 'error']);
  });
});
