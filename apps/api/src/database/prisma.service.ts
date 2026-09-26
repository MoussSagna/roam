import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfigService } from '../config/app-config.service.js';
import { PrismaClient } from '../generated/prisma/client.js';

/** How long a connectivity check may take before the database is reported unavailable. */
export const DATABASE_PING_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The application's only Prisma client (PostgreSQL through the `pg` driver adapter, Prisma 7), shared
 * by every module through `DatabaseModule`. Repositories inject it; controllers and services never
 * create a client or a connection of their own.
 *
 * Lifecycle: on startup it checks that the database answers. In production an unreachable database
 * stops the startup; elsewhere the API starts anyway (so it can run without a local PostgreSQL) and
 * reports it on `/health/database`. The connection pool is closed on shutdown.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Database');
  private readonly requiredAtStartup: boolean;

  constructor(config: AppConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.database.url }) });
    this.requiredAtStartup = config.database.requiredAtStartup;
  }

  async onModuleInit(): Promise<void> {
    try {
      await withTimeout(this.$queryRaw`SELECT 1`, DATABASE_PING_TIMEOUT_MS);
      this.logger.log('Database connection established');
    } catch (error) {
      // The error name/code only: driver messages can contain host details.
      const reason = describe(error);
      if (this.requiredAtStartup) {
        // A clean error: the driver's own (host, port, raw query) stays out of the logs.
        throw new Error(`Database unreachable at startup (${reason})`);
      }
      this.logger.warn(
        `Database unreachable at startup (${reason}); the API starts without it — see /health/database`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** True when the database answers a trivial query in time. Never throws. */
  async isReachable(): Promise<boolean> {
    try {
      await withTimeout(this.$queryRaw`SELECT 1`, DATABASE_PING_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? `${error.name} ${code}` : error.name;
}
