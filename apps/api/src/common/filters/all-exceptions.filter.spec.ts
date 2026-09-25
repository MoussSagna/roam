import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ApiException } from '../errors/api-error.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function run(exception: unknown) {
  const response = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const request = { method: 'GET', originalUrl: '/api/v1/things?token=abc' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return response;
}

describe('AllExceptionsFilter', () => {
  // The filter logs server-side on purpose; keep the test output readable.
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps the status and message of an HttpException, with a code', () => {
    const response = run(new NotFoundException('Experience not found'));

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Experience not found' },
    });
  });

  it('uses the code and details of an ApiException', () => {
    const response = run(
      new ApiException(HttpStatus.CONFLICT, 'JOURNEY_ALREADY_ACTIVE', 'Already active', {
        id: 'j1',
      }),
    );

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: { code: 'JOURNEY_ALREADY_ACTIVE', message: 'Already active', details: { id: 'j1' } },
    });
  });

  it('joins the message list of a framework error', () => {
    const response = run(new BadRequestException(['a is required', 'b is required']));

    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'a is required; b is required' },
    });
  });

  it('turns an unexpected error into a generic 500, without its message or stack', () => {
    const response = run(new Error('relation "users" does not exist at /srv/app.ts:12'));

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/relation|\/srv/);
  });

  it('hides database driver details (Prisma errors)', () => {
    const initError = Object.assign(
      new Error("Can't reach database server at db:5432 (password=x)"),
      {
        name: 'PrismaClientInitializationError',
      },
    );
    const queryError = Object.assign(
      new Error('Unique constraint failed on the fields: (`email`)'),
      {
        name: 'PrismaClientKnownRequestError',
      },
    );

    expect(run(initError).statusCode).toBe(503);
    expect(run(initError).body).toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable.' },
    });
    expect(run(queryError).statusCode).toBe(500);
    expect(JSON.stringify(run(queryError).body)).not.toContain('email');
  });
});
