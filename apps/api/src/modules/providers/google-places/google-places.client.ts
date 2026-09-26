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
  type GoogleErrorBody,
  type GooglePlaceDto,
  parseGooglePlace,
  parseNearbySearchResponse,
} from './google-places.dto.js';

export const GOOGLE_PLACES_PROVIDER = { key: 'google_places', name: 'Google Places' } as const;

const BASE_URL = 'https://places.googleapis.com/v1';

/**
 * The fields ROAM reads (GOOGLE_PLACES_PROVIDER.md "Field mask"): identity, location, address, classification,
 * status, Maps link, rating and price level. Never `*`. Photos, opening hours, reviews, website, phone and summaries
 * are not requested: no ROAM model or feature uses them yet, and several are billed at a higher SKU.
 */
export const PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'addressComponents',
  'location',
  'types',
  'businessStatus',
  'googleMapsUri',
  'rating',
  'userRatingCount',
  'priceLevel',
] as const;

/** Place Details takes the fields as they are; Nearby Search nests them under `places.`. */
export const DETAILS_FIELD_MASK = PLACE_FIELDS.join(',');
export const NEARBY_FIELD_MASK = PLACE_FIELDS.map((field) => `places.${field}`).join(',');

/** Results in French for Paris (MVP scope: Paris and nearby areas — DATA_FOUNDATION.md). */
const LANGUAGE_CODE = 'fr';
const REGION_CODE = 'FR';

export type GoogleNearbySearchRequest = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxResultCount: number;
  includedTypes?: string[];
};

/**
 * HTTP access to Google Places API (New): URL, API key header, field mask, timeout, status codes, response
 * validation, typed errors. No persistence, no normalization, no ROAM rule. No retry: a failure is reported once
 * (a 429 in particular is never retried here).
 *
 * Logs one line per call — operation, HTTP status, duration, result count or error class — never the key, the
 * headers, the request or the response body.
 */
@Injectable()
export class GooglePlacesClient {
  static readonly TIMEOUT_MS = 5_000;

  private readonly logger = new Logger('GooglePlacesClient');

  constructor(private readonly config: AppConfigService) {}

  /** Nearby Search (New): places within a circle, at most 20. */
  async searchNearby(request: GoogleNearbySearchRequest): Promise<GooglePlaceDto[]> {
    const operation = 'searchNearby';
    const body = {
      locationRestriction: {
        circle: {
          center: { latitude: request.latitude, longitude: request.longitude },
          radius: request.radiusMeters,
        },
      },
      maxResultCount: request.maxResultCount,
      ...(request.includedTypes?.length ? { includedTypes: request.includedTypes } : {}),
      languageCode: LANGUAGE_CODE,
      regionCode: REGION_CODE,
    };
    return this.call(operation, async (started) => {
      const json = await this.request(operation, `${BASE_URL}/places:searchNearby`, {
        method: 'POST',
        fieldMask: NEARBY_FIELD_MASK,
        body: JSON.stringify(body),
      });
      const parsed = parseNearbySearchResponse(json);
      if (!parsed) throw this.invalidResponse(operation);
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms: ${parsed.places.length} places, ${parsed.skipped} skipped (invalid)`,
      );
      return parsed.places;
    });
  }

  /** Place Details (New). Throws `ProviderNotFoundError` for an unknown place id. */
  async getPlace(placeId: string): Promise<GooglePlaceDto> {
    const operation = 'getPlace';
    const query = new URLSearchParams({ languageCode: LANGUAGE_CODE, regionCode: REGION_CODE });
    return this.call(operation, async (started) => {
      const json = await this.request(
        operation,
        `${BASE_URL}/places/${encodeURIComponent(placeId)}?${query.toString()}`,
        { method: 'GET', fieldMask: DETAILS_FIELD_MASK },
      );
      const place = parseGooglePlace(json);
      if (!place) throw this.invalidResponse(operation);
      this.logger.debug(`${operation} ok in ${Date.now() - started} ms`);
      return place;
    });
  }

  /** Runs one operation and logs its failure (error class only) once. */
  private async call<T>(operation: string, run: (started: number) => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      return await run(started);
    } catch (error) {
      // Provider error messages hold the provider, operation and HTTP/Google status only (provider.errors.ts).
      const reason = error instanceof ProviderError ? error.message : (error as Error).name;
      this.logger.warn(
        `${operation} failed in ${Date.now() - started} ms: ${(error as Error).name} — ${reason}`,
      );
      throw error;
    }
  }

  private async request(
    operation: string,
    url: string,
    init: { method: 'GET' | 'POST'; fieldMask: string; body?: string },
  ): Promise<unknown> {
    const apiKey = this.config.providers.googlePlacesApiKey;
    if (!apiKey) {
      throw new ProviderConfigurationError(
        GOOGLE_PLACES_PROVIDER.key,
        operation,
        'GOOGLE_PLACES_API_KEY is not set',
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': init.fieldMask,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body,
        signal: AbortSignal.timeout(GooglePlacesClient.TIMEOUT_MS),
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ProviderTimeoutError(
          GOOGLE_PLACES_PROVIDER.key,
          operation,
          `no response within ${GooglePlacesClient.TIMEOUT_MS} ms`,
        );
      }
      throw new ProviderUnavailableError(GOOGLE_PLACES_PROVIDER.key, operation, 'network error');
    }

    if (!response.ok) throw await this.httpError(operation, response);

    try {
      return (await response.json()) as unknown;
    } catch {
      throw this.invalidResponse(operation);
    }
  }

  /** Maps a non-2xx answer to a typed error, from the HTTP status and Google's status/reason codes only. */
  private async httpError(operation: string, response: Response): Promise<ProviderError> {
    const key = GOOGLE_PLACES_PROVIDER.key;
    const { status } = response;
    const body = (await response.json().catch(() => ({}))) as GoogleErrorBody & {
      error?: { details?: { reason?: unknown }[] };
    };
    const googleStatus =
      typeof body.error?.status === 'string' ? body.error.status : 'UNKNOWN_STATUS';
    // google.rpc.ErrorInfo reason: an upper-case code (SERVICE_DISABLED, API_KEY_INVALID…), safe to report — unlike
    // Google's message and metadata, which are never kept.
    const reason = Array.isArray(body.error?.details)
      ? body.error.details
          .map((item) => item?.reason)
          .find(
            (value): value is string => typeof value === 'string' && /^[A-Z_]{1,64}$/.test(value),
          )
      : undefined;
    const detail = `HTTP ${status} ${googleStatus}${reason ? ` (${reason})` : ''}`;
    // An invalid key is answered with 400 INVALID_ARGUMENT and the reason API_KEY_INVALID.
    const invalidKey = reason === 'API_KEY_INVALID';

    if (status === 401 || status === 403 || invalidKey)
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
      GOOGLE_PLACES_PROVIDER.key,
      operation,
      'response does not match the documented shape',
    );
  }
}
