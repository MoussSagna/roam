import { ApiError, CLIENT_ERROR_CODES } from './apiError';
import type { SessionStorage } from './sessionStorage';

/**
 * The app's single network entry point (DATA-8): every API repository goes through it, no screen, hook or
 * repository calls `fetch` itself. It owns the base URL and the `/api/v1` prefix, JSON, the bearer token,
 * the timeout, and the translation of every outcome into either the `data` of the API's
 * `{ "data": … }` envelope or an `ApiError`.
 *
 * No automatic retry of any kind: a 401 clears the session once and is reported, a 429 is reported with its
 * `Retry-After` — the caller (ultimately the user) decides what to do next.
 */

export const API_PREFIX = '/api/v1';
export const DEFAULT_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  query?: Record<string, QueryValue>;
  /** Sends the stored session token (default). `false` for the public auth routes. */
  authenticated?: boolean;
};

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  delete<T = void>(path: string, options?: RequestOptions): Promise<T>;
}

type ApiClientOptions = {
  /** The API origin (`http://localhost:3000`), without `/api/v1` — see `config/dataSource.ts`. */
  baseUrl: string;
  sessionStorage: SessionStorage;
  /** Called once after a 401 answered to a request that carried a token (the token is already cleared). */
  onUnauthorized?: () => void;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function buildUrl(baseUrl: string, path: string, query: RequestOptions['query']): string {
  const url = `${baseUrl}${API_PREFIX}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length > 0 ? `${url}?${params.join('&')}` : url;
}

/** `Retry-After` is either seconds or an HTTP date (RFC 9110); the API sends seconds. */
function parseRetryAfter(header: string | null, details: unknown): number | undefined {
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  if (details && typeof details === 'object' && 'retryAfterSeconds' in details) {
    const seconds = (details as { retryAfterSeconds: unknown }).retryAfterSeconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) return seconds;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResponse(status: number): ApiError {
  return new ApiError({
    status,
    code: CLIENT_ERROR_CODES.invalidResponse,
    message: 'The server answered with an unexpected response.',
  });
}

/** The API's error envelope, or `null` when the body does not follow it. */
function readErrorEnvelope(
  body: unknown,
): { code: string; message: string; details?: unknown } | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  const { code, message, details } = body.error;
  if (typeof code !== 'string' || typeof message !== 'string') return null;
  return { code, message, details };
}

export function createApiClient({
  baseUrl,
  sessionStorage,
  onUnauthorized,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
}: ApiClientOptions): ApiClient {
  async function request<T>(
    method: Method,
    path: string,
    body: unknown,
    { query, authenticated = true }: RequestOptions = {},
  ): Promise<T> {
    const token = authenticated ? await sessionStorage.getToken() : null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    let text: string;
    try {
      response = await fetchImpl(buildUrl(baseUrl, path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      text = response.status === 204 ? '' : await response.text();
    } catch {
      // Deliberately no URL, header or body in the error: nothing private can leak into a log or a screen.
      throw timedOut
        ? new ApiError({
            status: 0,
            code: CLIENT_ERROR_CODES.timeout,
            message: 'The server took too long to answer.',
          })
        : new ApiError({
            status: 0,
            code: CLIENT_ERROR_CODES.network,
            message: 'The request could not reach the server.',
          });
    } finally {
      clearTimeout(timer);
    }

    let parsed: unknown = undefined;
    if (text.trim() !== '') {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw invalidResponse(response.status);
      }
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        // The session is gone server-side (expired, revoked, logged out elsewhere): forget it once, report
        // it once. Never replayed — the next request goes out without a token and cannot loop.
        await sessionStorage.clearToken();
        onUnauthorized?.();
      }
      const envelope = readErrorEnvelope(parsed);
      if (!envelope) throw invalidResponse(response.status);
      throw new ApiError({
        status: response.status,
        code: envelope.code,
        message: envelope.message,
        details: envelope.details,
        retryAfterSeconds:
          response.status === 429
            ? parseRetryAfter(response.headers.get('Retry-After'), envelope.details)
            : undefined,
      });
    }

    // 204 and other empty successes carry nothing.
    if (parsed === undefined) return undefined as T;
    if (!isRecord(parsed) || !('data' in parsed)) throw invalidResponse(response.status);
    return parsed.data as T;
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}
