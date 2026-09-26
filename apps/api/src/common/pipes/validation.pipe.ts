import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';

import { ApiException, ErrorCode, type FieldError } from '../errors/api-error.js';

/** Flattens class-validator errors (nested DTOs included) into `{ field, messages }` entries. */
export function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints ? [{ field, messages: Object.values(error.constraints) }] : [];
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

/**
 * The global input validation (DTOs with class-validator):
 * - `whitelist` strips properties a DTO does not declare, and `forbidNonWhitelisted` rejects them
 *   instead, so a client typo is an error, not silently ignored data;
 * - `transform` turns payloads into DTO instances (and path/query strings into the declared types
 *   where a DTO or `ParseIntPipe` asks for it — no implicit conversion);
 * - failures become a 400 `VALIDATION_ERROR` listing every invalid field. The rejected values are
 *   not echoed back.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationError,
        'The request is invalid.',
        toFieldErrors(errors),
      ),
  });
}
