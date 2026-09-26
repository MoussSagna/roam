/**
 * The one error type of the API layer. The ROAM API answers `{ error: { code, message, details? } }`
 * (`apps/api/apidocs/BACKEND_FOUNDATION.md`); the client turns that — and every transport failure — into
 * an `ApiError`, so repositories and screens never parse a response body or an HTTP status themselves.
 */

/** Codes produced by the client itself, when there is no usable API answer. */
export const CLIENT_ERROR_CODES = {
  /** No connection, DNS failure, server down: the request never got an answer. */
  network: 'NETWORK_ERROR',
  /** No answer within the client's timeout. */
  timeout: 'TIMEOUT',
  /** An answer that is not the API's JSON contract (HTML error page, truncated body…). */
  invalidResponse: 'INVALID_RESPONSE',
} as const;

/** API codes the app reacts to (the full list lives in the API docs). */
export const API_ERROR_CODES = {
  invalidCredentials: 'AUTH_INVALID_CREDENTIALS',
  unauthorized: 'AUTH_UNAUTHORIZED',
  sessionInvalid: 'AUTH_SESSION_INVALID',
  emailAlreadyExists: 'AUTH_EMAIL_ALREADY_EXISTS',
  validation: 'VALIDATION_ERROR',
  notFound: 'NOT_FOUND',
  tooManyRequests: 'TOO_MANY_REQUESTS',
} as const;

type ApiErrorInit = {
  /** HTTP status, or `0` when there was no HTTP answer (network, timeout). */
  status: number;
  code: string;
  message: string;
  details?: unknown;
  /** Seconds to wait before retrying, from `Retry-After` on a 429. */
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly retryAfterSeconds: number | undefined;

  constructor({ status, code, message, details, retryAfterSeconds }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isNetworkError(): boolean {
    return this.code === CLIENT_ERROR_CODES.network || this.code === CLIENT_ERROR_CODES.timeout;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * The translation key of the message a screen shows for a failed request — one mapping for the whole
 * app instead of a status switch in every screen. Screen-specific cases (wrong password, email taken)
 * are handled by the screen before falling back to this.
 */
export function errorMessageKey(
  error: unknown,
): 'errors.network' | 'errors.tooManyRequests' | 'errors.sessionExpired' | 'errors.generic' {
  if (!isApiError(error)) return 'errors.generic';
  if (error.isNetworkError) return 'errors.network';
  if (error.isRateLimited) return 'errors.tooManyRequests';
  if (error.isUnauthorized) return 'errors.sessionExpired';
  return 'errors.generic';
}
