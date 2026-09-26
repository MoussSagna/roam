import { Injectable, type LogLevel as NestLogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type EnvironmentVariables, LogLevel, NodeEnv } from './environment.js';

const LOG_LEVELS: readonly NestLogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

/** Parses `CORS_ORIGINS` ("a, b ,c") into a clean list; empty when unset. */
export function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Levels enabled for a threshold: `warn` → fatal, error, warn. */
export function logLevelsUpTo(threshold: LogLevel): NestLogLevel[] {
  return LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(threshold) + 1);
}

/**
 * The single, typed access point to the configuration. Values come from the environment validated
 * by `validateEnvironment`; defaults that depend on the environment are decided here, once.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  private get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.config.get(key, { infer: true });
  }

  get app() {
    const env = this.get('NODE_ENV');
    return {
      env,
      isProduction: env === NodeEnv.Production,
      port: this.get('PORT'),
    };
  }

  get database() {
    return {
      url: this.get('DATABASE_URL'),
      /** Production refuses to start without its database; elsewhere the API starts and reports it. */
      requiredAtStartup: this.app.isProduction,
    };
  }

  get cors() {
    return { origins: parseOrigins(this.get('CORS_ORIGINS')) };
  }

  get logging() {
    const threshold =
      this.get('LOG_LEVEL') ??
      (this.app.env === NodeEnv.Production
        ? LogLevel.Log
        : this.app.env === NodeEnv.Test
          ? LogLevel.Warn
          : LogLevel.Debug);
    return { levels: logLevelsUpTo(threshold) };
  }

  get swagger() {
    return { enabled: this.get('SWAGGER_ENABLED') ?? !this.app.isProduction, path: 'docs' };
  }

  /** Future provider credentials (Data Foundation). Never log these values. */
  get providers() {
    return {
      googlePlacesApiKey: this.get('GOOGLE_PLACES_API_KEY'),
      ticketmasterApiKey: this.get('TICKETMASTER_API_KEY'),
    };
  }

  /** Future authentication settings. Never log these values. */
  get auth() {
    return { jwtSecret: this.get('AUTH_JWT_SECRET') };
  }
}
