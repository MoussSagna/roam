import {
  Body,
  Controller,
  Get,
  HttpStatus,
  type INestApplication,
  Module,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, MinLength } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { ApiException, type ErrorResponseBody } from '../src/common/errors/api-error.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { Public } from '../src/modules/auth/auth.guard.js';

/** A test-only module standing in for a future domain module, to exercise the conventions end to end. */
class CreateProbeDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@Public()
@Controller('probes')
class ProbeController {
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return { id, idType: typeof id };
  }

  @Post()
  create(@Body() dto: CreateProbeDto) {
    return { name: dto.name, isDto: dto instanceof CreateProbeDto };
  }

  @Get('errors/conflict')
  conflict() {
    throw new ApiException(HttpStatus.CONFLICT, 'PROBE_CONFLICT', 'Probe already exists');
  }

  @Get('errors/bug')
  bug() {
    throw new TypeError("Cannot read properties of undefined (reading 'secretField')");
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/** Stands in for PostgreSQL: no database is needed to run these tests. */
const prismaMock = {
  reachable: true,
  isReachable: vi.fn(() => Promise.resolve(prismaMock.reachable)),
  onModuleInit: vi.fn(() => Promise.resolve()),
  onModuleDestroy: vi.fn(() => Promise.resolve()),
};

describe('ROAM API (application bootstrapped as in production, database mocked)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, ProbeModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prismaMock.reachable = true;
  });

  describe('health', () => {
    it('GET /health → 200 { status: "ok" }, outside the /api prefix and the envelope', async () => {
      await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
      await request(app.getHttpServer()).get('/api/v1/health').expect(404);
    });

    it('GET /health does not depend on the database', async () => {
      prismaMock.reachable = false;
      await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
    });

    it('GET /health/database → 200 when the database answers, 503 otherwise', async () => {
      await request(app.getHttpServer())
        .get('/health/database')
        .expect(200)
        .expect({ status: 'ok' });

      prismaMock.reachable = false;
      await request(app.getHttpServer())
        .get('/health/database')
        .expect(503)
        .expect({
          error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable.' },
        });
    });
  });

  describe('routing and response convention', () => {
    it('serves modules under /api/v1 and wraps success responses in { data }', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/probes/7')
        .expect(200)
        .expect({ data: { id: 7, idType: 'number' } });
    });

    it('answers an unknown route with the error envelope', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/nope?token=abc').expect(404);
      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Cannot GET /api/v1/nope' },
      });
    });
  });

  describe('validation', () => {
    it('transforms a valid body into its DTO', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/probes')
        .send({ name: 'Canal' })
        .expect(201)
        .expect({ data: { name: 'Canal', isDto: true } });
    });

    it('rejects invalid and unexpected fields with VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/probes')
        .send({ name: 'x', role: 'admin' })
        .expect(400);

      const { error } = response.body as ErrorResponseBody;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([
        { field: 'role', messages: ['property role should not exist'] },
        { field: 'name', messages: ['name must be longer than or equal to 2 characters'] },
      ]);
    });

    it('rejects a malformed path parameter', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/probes/abc').expect(400);
      expect((response.body as ErrorResponseBody).error.code).toBe('BAD_REQUEST');
    });
  });

  describe('errors', () => {
    it('returns the code of an ApiException', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/probes/errors/conflict')
        .expect(409)
        .expect({ error: { code: 'PROBE_CONFLICT', message: 'Probe already exists' } });
    });

    it('hides an unexpected error behind a generic 500 (no message, no stack)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/probes/errors/bug')
        .expect(500);

      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      });
      expect(response.text).not.toMatch(/secretField|at .*\.ts/);
    });
  });

  describe('security foundation', () => {
    it('sends security headers and hides the framework', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS: allows the configured origin only', async () => {
      const allowed = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://localhost:8081');
      const other = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'https://evil.example');

      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8081');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('OpenAPI', () => {
    it('publishes the document on /docs-json (outside production)', async () => {
      const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

      const document = response.body as { info: { title: string }; paths: Record<string, unknown> };
      expect(document.info.title).toBe('ROAM API');
      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining(['/health', '/health/database']),
      );
    });
  });
});
