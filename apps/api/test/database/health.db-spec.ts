import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import type { AppConfigService } from '../../src/config/app-config.service.js';
import { PrismaService } from '../../src/database/prisma.service.js';

/** Collects every log line, to check that no secret reaches the logs. */
class RecordingLogger implements LoggerService {
  readonly lines: string[] = [];
  private record = (...parts: unknown[]) => {
    this.lines.push(parts.map((part) => JSON.stringify(part) ?? String(part)).join(' '));
  };
  log = this.record;
  error = this.record;
  warn = this.record;
  debug = this.record;
  verbose = this.record;
  fatal = this.record;
}

async function startApp(logger: RecordingLogger, prisma?: PrismaService) {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (prisma) builder = builder.overrideProvider(PrismaService).useValue(prisma);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger });
  configureApp(app);
  await app.init();
  return app;
}

const testPassword = () => decodeURIComponent(new URL(process.env.DATABASE_URL!).password);

/** The health endpoints of the real application on a real PostgreSQL (the test database). */
describe('health on PostgreSQL', () => {
  it('connects at startup; /health and /health/database answer 200', async () => {
    const logger = new RecordingLogger();
    const app = await startApp(logger);

    try {
      await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
      await request(app.getHttpServer())
        .get('/health/database')
        .expect(200)
        .expect({ status: 'ok' });
    } finally {
      await app.close();
    }

    expect(logger.lines.join('\n')).toContain('Database connection established');
    if (testPassword()) expect(logger.lines.join('\n')).not.toContain(testPassword());
  });

  it('database unavailable: the API starts, /health stays 200, /health/database answers 503, no secret logged', async () => {
    const secret = 'n0t-a-real-password';
    const config = {
      database: {
        // Nothing listens on port 1: the connection is refused at once.
        url: `postgresql://roam:${secret}@127.0.0.1:1/roam_test`,
        requiredAtStartup: false,
      },
    } as AppConfigService;
    const logger = new RecordingLogger();
    const app = await startApp(logger, new PrismaService(config));

    try {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer())
        .get('/health/database')
        .expect(503)
        .expect({
          error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable.' },
        });
    } finally {
      await app.close();
    }

    const logs = logger.lines.join('\n');
    expect(logs).toContain('Database unreachable at startup');
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain('127.0.0.1:1');
  });
});
