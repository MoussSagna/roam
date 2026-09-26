import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable, machine-readable error codes returned in `error.code`. Add domain codes as modules need them. */
export const ErrorCode = {
  BadRequest: 'BAD_REQUEST',
  ValidationError: 'VALIDATION_ERROR',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  MethodNotAllowed: 'METHOD_NOT_ALLOWED',
  Conflict: 'CONFLICT',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  UnprocessableEntity: 'UNPROCESSABLE_ENTITY',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  DatabaseUnavailable: 'DATABASE_UNAVAILABLE',
  InternalError: 'INTERNAL_ERROR',
  HttpError: 'HTTP_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Body of every error response. */
export type ErrorResponseBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * An error the API reports on purpose, with its own code: throw it from a service or controller
 * (`throw new ApiException(HttpStatus.CONFLICT, 'JOURNEY_ALREADY_ACTIVE', '…')`). The global filter
 * turns it into the error body.
 */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

/** One invalid input field, as reported in `error.details` of a `VALIDATION_ERROR`. */
export type FieldError = { field: string; messages: string[] };
