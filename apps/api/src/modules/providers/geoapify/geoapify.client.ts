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
  type GeoapifyErrorBody,
  type GeoapifyPlaceDto,
  type OsmType,
  parseFeatureCollection,
} from './geoapify.dto.js';

export const GEOAPIFY_PROVIDER = { key: 'geoapify', name: 'Geoapify' } as const;

const BASE_URL = 'https://api.geoapify.com/v2';

/** Results in French for Paris (MVP scope: Paris and nearby areas — DATA_FOUNDATION.md). */
const LANG = 'fr';

export type GeoapifyNearbyRequest = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  limit: number;
  /** Geoapify category keys; Geoapify requires at least one. */
  categories: string[];
};

/**
 * HTTP access to the Geoapify Places and Place Details APIs: URL, API key header, timeout, status codes, response
 * validation, typed errors. No persistence, no normalization, no ROAM rule. No retry: a failure is reported once
 * (a 429 in particular is never retried here).
 *
 * The key goes in the `X-Api-Key` header, never in the URL (URLs end up in proxy and error logs). Logs one line per
 * call — operation, duration, result count or error class — never the key, the headers, the request or the body.
 */
@Injectable()
export class GeoapifyClient {
  /**
   * Geoapify answers a small POI search in well under a second; beyond 5 s the call is treated as failed. Its own
   * constant (no shared timeout setting exists), reviewed per provider.
   */
  static readonly TIMEOUT_MS = 5_000;

  private readonly logger = new Logger('GeoapifyClient');

  constructor(private readonly config: AppConfigService) {}

  /** Places API: places of these categories within a circle. */
  async searchNearby(request: GeoapifyNearbyRequest): Promise<GeoapifyPlaceDto[]> {
    const operation = 'searchNearby';
    const query = new URLSearchParams({
      categories: request.categories.join(','),
      // Geoapify takes longitude first.
      filter: `circle:${request.longitude},${request.latitude},${request.radiusMeters}`,
      limit: String(request.limit),
      lang: LANG,
    });
    return this.call(operation, async (started) => {
      const parsed = parseFeatureCollection(
        await this.request(operation, `${BASE_URL}/places?${query.toString()}`),
      );
      if (!parsed) throw this.invalidResponse(operation);
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms: ${parsed.places.length} places, ${parsed.skipped} skipped (invalid)`,
      );
      return parsed.places;
    });
  }

  /**
   * Place Details API, looked up by the OpenStreetMap object. `null` when Geoapify does not know it (Geoapify answers
   * 200 with no feature).
   */
  async getPlace(osmType: OsmType, osmId: string): Promise<GeoapifyPlaceDto | null> {
    const operation = 'getPlace';
    const query = new URLSearchParams({
      osm_type: osmType.charAt(0),
      osm_id: osmId,
      features: 'details',
      lang: LANG,
    });
    return this.call(operation, async (started) => {
      const parsed = parseFeatureCollection(
        await this.request(operation, `${BASE_URL}/place-details?${query.toString()}`),
      );
      if (!parsed) throw this.invalidResponse(operation);
      const [place] = parsed.places;
      if (!place && parsed.skipped > 0) throw this.invalidResponse(operation);
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms${place ? '' : ': not found'}`,
      );
      return place ?? null;
    });
  }

  /** Runs one operation and logs its failure (error class only) once. */
  private async call<T>(operation: string, run: (started: number) => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      return await run(started);
    } catch (error) {
      // Provider error messages hold the provider, operation and HTTP status only (provider.errors.ts).
      const reason = error instanceof ProviderError ? error.message : (error as Error).name;
      this.logger.warn(
        `${operation} failed in ${Date.now() - started} ms: ${(error as Error).name} — ${reason}`,
      );
      throw error;
    }
  }

  private async request(operation: string, url: string): Promise<unknown> {
    const apiKey = this.config.providers.geoapifyApiKey;
    if (!apiKey) {
      throw new ProviderConfigurationError(
        GEOAPIFY_PROVIDER.key,
        operation,
        'GEOAPIFY_API_KEY is not set',
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(GeoapifyClient.TIMEOUT_MS),
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ProviderTimeoutError(
          GEOAPIFY_PROVIDER.key,
          operation,
          `no response within ${GeoapifyClient.TIMEOUT_MS} ms`,
        );
      }
      throw new ProviderUnavailableError(GEOAPIFY_PROVIDER.key, operation, 'network error');
    }

    if (!response.ok) throw await this.httpError(operation, response);

    try {
      return (await response.json()) as unknown;
    } catch {
      throw this.invalidResponse(operation);
    }
  }

  /** Maps a non-2xx answer to a typed error, from the HTTP status and Geoapify's short error name only. */
  private async httpError(operation: string, response: Response): Promise<ProviderError> {
    const key = GEOAPIFY_PROVIDER.key;
    const { status } = response;
    const body = (await response.json().catch(() => ({}))) as GeoapifyErrorBody;
    // `error` is the HTTP reason phrase ("Unauthorized", "Bad Request"…), safe to report — unlike `message`, which
    // can echo the request and is never kept.
    const name =
      typeof body.error === 'string' && /^[A-Za-z ]{1,40}$/.test(body.error) ? body.error : '';
    const detail = `HTTP ${status}${name ? ` ${name}` : ''}`;

    if (status === 401 || status === 403)
      return new ProviderAuthenticationError(key, operation, detail);
    if (status === 404) return new ProviderNotFoundError(key, operation, detail);
    if (status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'));
      return new ProviderRateLimitError(
        key,
        operation,
        detail,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      );
    }
    if (status >= 500) return new ProviderUnavailableError(key, operation, detail, status);
    return new ProviderRequestError(key, operation, detail);
  }

  private invalidResponse(operation: string) {
    return new ProviderResponseError(
      GEOAPIFY_PROVIDER.key,
      operation,
      'response does not match the documented shape',
    );
  }
}
