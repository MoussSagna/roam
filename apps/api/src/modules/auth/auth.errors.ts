import { HttpStatus } from '@nestjs/common';

import { ApiException } from '../../common/errors/api-error.js';

/** Error codes of the authentication module (`error.code`), AUTHENTICATION.md → "Errors". */
export const AuthErrorCode = {
  EmailAlreadyExists: 'AUTH_EMAIL_ALREADY_EXISTS',
  InvalidCredentials: 'AUTH_INVALID_CREDENTIALS',
  Unauthorized: 'AUTH_UNAUTHORIZED',
  SessionInvalid: 'AUTH_SESSION_INVALID',
  ResetCodeInvalid: 'AUTH_RESET_CODE_INVALID',
} as const;

export const authErrors = {
  emailAlreadyExists: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      AuthErrorCode.EmailAlreadyExists,
      'An account already exists with this email.',
    ),
  /** Same answer for an unknown email and a wrong password. */
  invalidCredentials: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      AuthErrorCode.InvalidCredentials,
      'Invalid email or password.',
    ),
  unauthorized: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      AuthErrorCode.Unauthorized,
      'Authentication required.',
    ),
  /** Unknown, expired or revoked session: sign in again. */
  sessionInvalid: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      AuthErrorCode.SessionInvalid,
      'The session is invalid or has expired.',
    ),
  /** Wrong, expired or exhausted code, or unknown email: one answer for all. */
  resetCodeInvalid: () =>
    new ApiException(
      HttpStatus.BAD_REQUEST,
      AuthErrorCode.ResetCodeInvalid,
      'The code is invalid or has expired.',
    ),
};
