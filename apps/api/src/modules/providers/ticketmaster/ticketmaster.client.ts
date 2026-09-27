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
  parseEventSearchResponse,
  parseTicketmasterEvent,
  type TicketmasterErrorBody,
  type TicketmasterEventDto,
} from './ticketmaster.dto.js';

export const TICKETMASTER_PROVIDER = { key: 'ticketmaster', name: 'Ticketmaster' } as const;

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

export type TicketmasterEventSearchRequest = {
  /** Geohash of the searched point (`geoPoint`). */
  geoPoint: string;
  /** Whole kilometres: Ticketmaster refuses a decimal radius. */
  radiusKm: number;
  startDateTime: Date;
  endDateTime?: Date;
  size: number;
  segmentIds?: string[];
};

/** Ticketmaster wants `YYYY-MM-DDTHH:mm:ssZ`: UTC, no milliseconds. */
export const ticketmasterDateTime = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * HTTP access to the Ticketmaster Discovery API v2: URL, API key, timeout, status codes, response validation, typed
 * errors. No persistence, no normalization, no ROAM rule. No retry: a failure is reported once (a 429 in particular is
 * never retried here). One page per call: no automatic paging.
 *
 * Ticketmaster only accepts the key as the `apikey` query parameter: the request URL therefore holds it and is never
 * logged, put in an error or kept. Logs one line per call — operation, duration, result count, remaining daily quota,
 * or the error class — never the key, the URL, the request or the body.
 */
@Injectable()
export class TicketmasterClient {
  /** A small Discovery search answers in about a second; beyond 5 s the call is treated as failed. */
  static readonly TIMEOUT_MS = 5_000;

  private readonly logger = new Logger('TicketmasterClient');

  constructor(private readonly config: AppConfigService) {}

  /** Event Search: one page of events around a point, soonest first. */
  async searchEvents(request: TicketmasterEventSearchRequest): Promise<TicketmasterEventDto[]> {
    const operation = 'searchEvents';
    const query = new URLSearchParams({
      geoPoint: request.geoPoint,
      radius: String(request.radiusKm),
      unit: 'km',
      startDateTime: ticketmasterDateTime(request.startDateTime),
      ...(request.endDateTime ? { endDateTime: ticketmasterDateTime(request.endDateTime) } : {}),
      ...(request.segmentIds?.length ? { segmentId: request.segmentIds.join(',') } : {}),
      size: String(request.size),
      page: '0',
      sort: 'date,asc',
      // Every locale: Paris events are published in fr-fr.
      locale: '*',
    });
    return this.call(operation, async (started) => {
      const { json, quotaLeft } = await this.request(operation, `/events.json`, query);
      const parsed = parseEventSearchResponse(json);
      if (!parsed) throw this.invalidResponse(operation);
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms: ${parsed.events.length} events, ${parsed.skipped} skipped` +
          ` (invalid, test or date to be announced)${quotaLeft}`,
      );
      return parsed.events;
    });
  }

  /** Event Details. Throws `ProviderNotFoundError` for an unknown event id. */
  async getEvent(eventId: string): Promise<TicketmasterEventDto> {
    const operation = 'getEvent';
    return this.call(operation, async (started) => {
      const { json, quotaLeft } = await this.request(
        operation,
        `/events/${encodeURIComponent(eventId)}.json`,
        new URLSearchParams({ locale: '*' }),
      );
      const event = parseTicketmasterEvent(json);
      if (!event) throw this.invalidResponse(operation);
      this.logger.debug(`${operation} ok in ${Date.now() - started} ms${quotaLeft}`);
      return event;
    });
  }

  /** Runs one operation and logs its failure (error class only) once. */
  private async call<T>(operation: string, run: (started: number) => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      return await run(started);
    } catch (error) {
      // Provider error messages hold the provider, operation, HTTP status and error code only (provider.errors.ts).
      const reason = error instanceof ProviderError ? error.message : (error as Error).name;
      this.logger.warn(
        `${operation} failed in ${Date.now() - started} ms: ${(error as Error).name} — ${reason}`,
      );
      throw error;
    }
  }

  private async request(
    operation: string,
    path: string,
    query: URLSearchParams,
  ): Promise<{ json: unknown; quotaLeft: string }> {
    const apiKey = this.config.providers.ticketmasterApiKey;
    if (!apiKey) {
      throw new ProviderConfigurationError(
        TICKETMASTER_PROVIDER.key,
        operation,
        'TICKETMASTER_API_KEY is not set',
      );
    }

    let response: Response;
    try {
      // The only place the key is attached; this URL is never logged or kept.
      const authenticated = new URLSearchParams(query);
      authenticated.set('apikey', apiKey);
      response = await fetch(`${BASE_URL}${path}?${authenticated.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TicketmasterClient.TIMEOUT_MS),
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ProviderTimeoutError(
          TICKETMASTER_PROVIDER.key,
          operation,
          `no response within ${TicketmasterClient.TIMEOUT_MS} ms`,
        );
      }
      throw new ProviderUnavailableError(TICKETMASTER_PROVIDER.key, operation, 'network error');
    }

    if (!response.ok) throw await this.httpError(operation, response);

    const available = Number(response.headers.get('rate-limit-available'));
    const quotaLeft =
      response.headers.has('rate-limit-available') && Number.isInteger(available)
        ? `, daily quota left ${available}`
        : '';
    try {
      return { json: (await response.json()) as unknown, quotaLeft };
    } catch {
      throw this.invalidResponse(operation);
    }
  }

  /** Maps a non-2xx answer to a typed error, from the HTTP status and Ticketmaster's error code only. */
  private async httpError(operation: string, response: Response): Promise<ProviderError> {
    const key = TICKETMASTER_PROVIDER.key;
    const { status } = response;
    const body = (await response.json().catch(() => ({}))) as TicketmasterErrorBody;
    // Codes are safe to report (`DIS1004`, `oauth.v2.InvalidApiKey`…); `detail` / `faultstring` can echo the request
    // (ids, parameters) and are never kept.
    const apiCode = Array.isArray(body.errors) ? body.errors[0]?.code : undefined;
    const faultCode = body.fault?.detail?.errorcode;
    const code = [apiCode, faultCode].find(
      (value): value is string => typeof value === 'string' && /^[\w.]{1,64}$/.test(value),
    );
    const detail = `HTTP ${status}${code ? ` (${code})` : ''}`;

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
      TICKETMASTER_PROVIDER.key,
      operation,
      'response does not match the documented shape',
    );
  }
}
