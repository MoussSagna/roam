import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../../config/app-config.service.js';
import {
  ProviderAuthenticationError,
  ProviderConfigurationError,
  ProviderError,
  ProviderNotFoundError,
  ProviderRateLimitError,
  ProviderRequestError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import {
  DATATOURISME_FIELDS,
  type DatatourismePageDto,
  type DatatourismePoiDto,
  parseDatatourismePage,
  parseDatatourismePoi,
} from './datatourisme.dto.js';

export const DATATOURISME_PROVIDER = { key: 'datatourisme', name: 'DATAtourisme' } as const;

const ORIGIN = 'https://api.datatourisme.fr';
const HOST = 'api.datatourisme.fr';

export type DatatourismeEndpoint = 'placeOfInterest' | 'entertainmentAndEvent';

/** Documented maximum `page_size` (OPEN_DATA_SOURCES.md). */
export const DATATOURISME_MAX_PAGE_SIZE = 100;

export type DatatourismeListRequest = {
  endpoint: DatatourismeEndpoint;
  /** Radius search: latitude, longitude, metres. */
  near?: { latitude: number; longitude: number; radiusMeters: number };
  /** Records updated since this calendar date (incremental sync), "YYYY-MM-DD". */
  updatedSince?: string;
  /** Events: ending on or after this calendar date. */
  start?: string;
  pageSize: number;
};

/**
 * Pagination links (`meta.next`) come from the provider and may hold the API key (`api_key=`, documented example). A
 * link is followed only when it points at the same host and endpoint; every key-like parameter is removed; what is
 * kept (the cursor) is a relative path — never logged in full, never shown outside the backend.
 */
export function sanitizeNextLink(raw: string, endpoint: DatatourismeEndpoint): string | null {
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== HOST) return null;
  if (url.pathname !== `/v1/${endpoint}`) return null;
  for (const name of [...url.searchParams.keys()])
    if (/^api[_-]?key$/i.test(name)) url.searchParams.delete(name);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/**
 * HTTP access to the DATAtourisme API v1 (production): key, timeout, status codes, response validation, typed errors.
 * No persistence, no normalization, no retry (the sync orchestrator decides). The key is sent only in the `X-API-Key`
 * header — never in a URL. Logs: operation, endpoint path, result counts, remaining hourly quota; never the key, a
 * query string or a payload.
 */
@Injectable()
export class DatatourismeClient {
  /** Observed answers take 0.1–0.2 s; a page of 100 with explicit fields stays well under 10 s. */
  static readonly TIMEOUT_MS = 10_000;

  private readonly logger = new Logger('DatatourismeClient');

  constructor(private readonly config: AppConfigService) {}

  /** One list page: the first one from `request`, the next ones from the sanitized cursor of the previous page. */
  async listPage(
    request: DatatourismeListRequest,
    cursor: string | null,
  ): Promise<DatatourismePageDto & { nextCursor: string | null }> {
    const operation = `list ${request.endpoint}`;
    let pathAndQuery: string;
    if (cursor) {
      const safe = sanitizeNextLink(cursor, request.endpoint);
      if (!safe) throw new RangeError('invalid DATAtourisme cursor');
      pathAndQuery = safe;
    } else {
      if (
        !Number.isInteger(request.pageSize) ||
        request.pageSize < 1 ||
        request.pageSize > DATATOURISME_MAX_PAGE_SIZE
      )
        throw new RangeError(`pageSize must be 1–${DATATOURISME_MAX_PAGE_SIZE}`);
      const query = new URLSearchParams({
        fields: DATATOURISME_FIELDS,
        lang: 'fr',
        page_size: String(request.pageSize),
        sort: 'uuid',
      });
      if (request.near) {
        const { latitude, longitude, radiusMeters } = request.near;
        query.set('geo_distance', `${latitude},${longitude},${Math.round(radiusMeters)}m`);
      }
      if (request.updatedSince) query.set('update', request.updatedSince);
      if (request.start) query.set('start', request.start);
      pathAndQuery = `/v1/${request.endpoint}?${query.toString()}`;
    }

    return this.call(operation, async (started) => {
      const { json, quota } = await this.request(operation, pathAndQuery);
      const page = parseDatatourismePage(json);
      if (!page) throw this.invalidResponse(operation);
      let nextCursor: string | null = null;
      if (page.next) {
        nextCursor = sanitizeNextLink(page.next, request.endpoint);
        // A link elsewhere is never followed: better stop than send the key to an unknown host.
        if (!nextCursor) throw this.invalidResponse(operation);
      }
      const skipped = Object.values(page.skipped).reduce((sum, n) => sum + n, 0);
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms: ${page.pois.length} records, ${skipped} skipped` +
          `${page.total !== null ? `, ${page.total} in total` : ''}${quota}`,
      );
      return { ...page, nextCursor };
    });
  }

  /** One POI by uuid. Throws `ProviderNotFoundError` for an unknown one. */
  async getPoi(uuid: string): Promise<{ poi: DatatourismePoiDto } | { skipped: string }> {
    const operation = 'getPoi';
    const query = new URLSearchParams({ fields: DATATOURISME_FIELDS, lang: 'fr' });
    return this.call(operation, async (started) => {
      const { json, quota } = await this.request(
        operation,
        `/v1/catalog/${encodeURIComponent(uuid)}?${query.toString()}`,
      );
      const parsed = parseDatatourismePoi(json);
      this.logger.debug(`${operation} ok in ${Date.now() - started} ms${quota}`);
      return parsed;
    });
  }

  private async call<T>(operation: string, run: (started: number) => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      return await run(started);
    } catch (error) {
      const reason = error instanceof ProviderError ? error.message : (error as Error).name;
      this.logger.warn(
        `${operation} failed in ${Date.now() - started} ms: ${(error as Error).name} — ${reason}`,
      );
      throw error;
    }
  }

  private async request(
    operation: string,
    pathAndQuery: string,
  ): Promise<{ json: unknown; quota: string }> {
    const apiKey = this.config.providers.datatourismeApiKey;
    if (!apiKey) {
      throw new ProviderConfigurationError(
        DATATOURISME_PROVIDER.key,
        operation,
        'DATATOURISME_API_KEY is not set',
      );
    }
    let response: Response;
    try {
      response = await fetch(`${ORIGIN}${pathAndQuery}`, {
        method: 'GET',
        // The only place the key is attached: a header, never the URL.
        headers: { Accept: 'application/json', 'X-API-Key': apiKey },
        signal: AbortSignal.timeout(DatatourismeClient.TIMEOUT_MS),
        redirect: 'error',
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ProviderTimeoutError(
          DATATOURISME_PROVIDER.key,
          operation,
          `no response within ${DatatourismeClient.TIMEOUT_MS} ms`,
        );
      }
      throw new ProviderUnavailableError(DATATOURISME_PROVIDER.key, operation, 'network error');
    }
    if (!response.ok) throw this.httpError(operation, response);
    const remaining = response.headers.get('x-ratelimit-remaining');
    const quota = remaining && /^\d+$/.test(remaining) ? `, hourly quota left ${remaining}` : '';
    try {
      return { json: (await response.json()) as unknown, quota };
    } catch {
      throw this.invalidResponse(operation);
    }
  }

  /** From the HTTP status only: DATAtourisme's error messages can echo the requested id. */
  private httpError(operation: string, response: Response): ProviderError {
    const key = DATATOURISME_PROVIDER.key;
    const { status } = response;
    const detail = `HTTP ${status}`;
    void response.body?.cancel().catch(() => undefined);
    if (status === 401 || status === 403)
      return new ProviderAuthenticationError(key, operation, detail);
    if (status === 404) return new ProviderNotFoundError(key, operation, detail);
    if (status === 429) {
      const header =
        response.headers.get('retry-after') ?? response.headers.get('x-ratelimit-reset');
      const seconds = Number(header);
      return new ProviderRateLimitError(
        key,
        operation,
        detail,
        Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined,
      );
    }
    if (status >= 500) return new ProviderUnavailableError(key, operation, detail, status);
    return new ProviderRequestError(key, operation, detail);
  }

  private invalidResponse(operation: string) {
    return new ProviderResponseError(
      DATATOURISME_PROVIDER.key,
      operation,
      'response does not match the documented shape',
    );
  }
}
