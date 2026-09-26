import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

/** Prisma errors are recognized by name, so this filter does not depend on the generated client. */
function isPrismaError(exception: unknown): exception is Error {
  return exception instanceof Error && exception.name.startsWith('PrismaClient');
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
 * Anything else — a bug, a database error — becomes a generic 500 (or 503 when the database is
 * unreachable): the stack trace and driver details are logged server-side, never sent to the client.
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
    } else if (isPrismaError(exception) && exception.name === 'PrismaClientInitializationError') {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = { code: ErrorCode.DatabaseUnavailable, message: 'The database is unavailable.' };
      this.logger.error(`${route} → 503 database unavailable (${exception.name})`);
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
