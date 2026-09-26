import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  CheckConstraintError,
  DatabaseUnavailableError,
  ForeignKeyConstraintError,
  InvalidCursorError,
  PersistenceError,
  RecordNotFoundError,
  toPersistenceError,
  UniqueConstraintError,
} from '../../database/persistence-errors.js';
import { ApiException, ErrorCode, type ErrorResponseBody } from '../errors/api-error.js';

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BadRequest,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthorized,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.METHOD_NOT_ALLOWED]: ErrorCode.MethodNotAllowed,
  [HttpStatus.CONFLICT]: ErrorCode.Conflict,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PayloadTooLarge,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UnprocessableEntity,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TooManyRequests,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.ServiceUnavailable,
};

const GENERIC_MESSAGE = 'An unexpected error occurred.';

/**
 * A persistence error no service turned into a domain error: a generic answer, never the constraint, the SQL
 * or the data (REPOSITORY_ARCHITECTURE.md → "Errors"). Services normally catch these first and throw an
 * `ApiException` with a domain code (e.g. JOURNEY_ALREADY_ACTIVE).
 */
function persistenceBody(error: PersistenceError): [number, ErrorResponseBody['error']] {
  if (error instanceof DatabaseUnavailableError) {
    return [
      HttpStatus.SERVICE_UNAVAILABLE,
      { code: ErrorCode.DatabaseUnavailable, message: 'The database is unavailable.' },
    ];
  }
  if (error instanceof RecordNotFoundError) {
    return [HttpStatus.NOT_FOUND, { code: ErrorCode.NotFound, message: 'Resource not found.' }];
  }
  if (error instanceof UniqueConstraintError) {
    return [
      HttpStatus.CONFLICT,
      { code: ErrorCode.Conflict, message: 'The resource already exists.' },
    ];
  }
  if (error instanceof ForeignKeyConstraintError) {
    return [
      HttpStatus.CONFLICT,
      { code: ErrorCode.Conflict, message: 'The operation conflicts with related data.' },
    ];
  }
  if (error instanceof CheckConstraintError) {
    return [
      HttpStatus.UNPROCESSABLE_ENTITY,
      { code: ErrorCode.UnprocessableEntity, message: 'The data breaks an integrity rule.' },
    ];
  }
  if (error instanceof InvalidCursorError) {
    return [HttpStatus.BAD_REQUEST, { code: ErrorCode.BadRequest, message: 'Invalid cursor.' }];
  }
  return [
    HttpStatus.INTERNAL_SERVER_ERROR,
    { code: ErrorCode.InternalError, message: GENERIC_MESSAGE },
  ];
}

function httpBody(exception: HttpException): ErrorResponseBody['error'] {
  const status = exception.getStatus();
  const response = exception.getResponse();
  const fallbackCode = CODE_BY_STATUS[status] ?? ErrorCode.HttpError;

  if (exception instanceof ApiException) {
    return { code: exception.code, message: exception.message, details: exception.details };
  }
  if (typeof response === 'string') return { code: fallbackCode, message: response };

  const body = response as { code?: unknown; message?: unknown; details?: unknown };
  const message = Array.isArray(body.message)
    ? body.message.join('; ')
    : typeof body.message === 'string'
      ? body.message
      : exception.message;
  return {
    code: typeof body.code === 'string' ? body.code : fallbackCode,
    // The router's own 404 ("Cannot GET /path?query") would echo the query string, which may carry
    // tokens: keep the path only.
    message: /^Cannot [A-Z]+ /.test(message) ? message.split('?')[0] : message,
    ...(body.details === undefined ? {} : { details: body.details }),
  };
}

/**
 * The one global error handler: every error leaves the API as `{ error: { code, message, details? } }`.
 * Expected errors (`HttpException`, `ApiException`, validation) keep their status and message.
 * Persistence errors (from the repositories, or a raw Prisma error translated here as a safety net) get a
 * generic status and message. Anything else — a bug, an unexpected database error — becomes a generic 500:
 * the stack trace is logged server-side, never sent to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const route = `${request.method} ${request.originalUrl.split('?')[0]}`;

    let status: number;
    let error: ErrorResponseBody['error'];
    const persistence = toPersistenceError(exception);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = httpBody(exception);
      // A 5xx the code raised on purpose (e.g. DATABASE_UNAVAILABLE) is an expected state: one line.
      // Any other 5xx HttpException keeps its stack trace for debugging.
      if (exception instanceof ApiException && status >= 500) {
        this.logger.warn(`${route} → ${status} ${error.code}`);
      } else if (status >= 500) {
        this.logger.error(`${route} → ${status} ${error.code}`, exception.stack);
      }
    } else if (persistence instanceof PersistenceError) {
      [status, error] = persistenceBody(persistence);
      // The class name only: a Prisma/driver message can carry the host or the rejected row.
      const line = `${route} → ${status} ${error.code} (${persistence.name})`;
      if (status >= 500) this.logger.error(line);
      else this.logger.warn(line);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = { code: ErrorCode.InternalError, message: GENERIC_MESSAGE };
      const name = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(
        `${route} → 500 unhandled ${name}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (!response.headersSent) response.status(status).json({ error } satisfies ErrorResponseBody);
  }
}
