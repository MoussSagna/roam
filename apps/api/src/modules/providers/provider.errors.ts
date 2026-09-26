/**
 * The errors a provider adapter may throw (PROVIDER_ARCHITECTURE.md "Failure handling"). Callers catch them by
 * class. Messages are built from the provider key, the operation and the HTTP/provider status only: never the API
 * key, a header, the request or the provider's payload. None of them is meant to reach the mobile app as is.
 */
export abstract class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly operation: string,
    detail: string,
  ) {
    super(`${provider} ${operation}: ${detail}`);
    this.name = new.target.name;
  }
}

/** The provider is not configured (e.g. its API key is missing): no request was sent. */
export class ProviderConfigurationError extends ProviderError {}

/** The provider did not answer within the timeout. */
export class ProviderTimeoutError extends ProviderError {}

/** The provider could not be reached (network) or failed on its side (5xx). */
export class ProviderUnavailableError extends ProviderError {
  constructor(
    provider: string,
    operation: string,
    detail: string,
    readonly status?: number,
  ) {
    super(provider, operation, detail);
  }
}

/** The provider refused the credentials (401/403: invalid, restricted or disabled key). */
export class ProviderAuthenticationError extends ProviderError {}

/** Quota or rate limit reached (429). Not retried: the caller decides when to try again. */
export class ProviderRateLimitError extends ProviderError {
  constructor(
    provider: string,
    operation: string,
    detail: string,
    /** From `Retry-After`, when the provider sends it. */
    readonly retryAfterSeconds?: number,
  ) {
    super(provider, operation, detail);
  }
}

/** The provider rejected the request as invalid (400). */
export class ProviderRequestError extends ProviderError {}

/** The requested record does not exist at the provider (404). */
export class ProviderNotFoundError extends ProviderError {}

/** The provider answered with something that is not the documented response. */
export class ProviderResponseError extends ProviderError {}
