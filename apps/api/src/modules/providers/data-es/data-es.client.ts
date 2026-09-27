import { Injectable, Logger } from '@nestjs/common';

import {
  ProviderError,
  ProviderRateLimitError,
  ProviderRequestError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../provider.errors.js';

export const DATA_ES_PROVIDER = {
  key: 'data_es',
  name: 'Data ES (Ministère chargé des Sports)',
} as const;

/**
 * The complete dataset `data-es` — never `data-es-equipement`, which publishes the declarants' names, emails and phone
 * numbers (OPEN_DATA_SOURCES.md §2.3). Opendatasoft Explore API v2.1, no key.
 */
export const DATA_ES_RECORDS_URL =
  'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/records';

/**
 * The only fields ROAM reads (data minimization). No declarant, owner name or SIRET: a test checks that no field of
 * this list is personal data and that nothing else is ever requested.
 */
export const DATA_ES_FIELDS = [
  'equip_numero',
  'inst_numero',
  'inst_nom',
  'equip_nom',
  'inst_adresse',
  'inst_cp',
  'new_name',
  'new_code',
  'dep_code',
  'equip_type_name',
  'equip_type_famille',
  'aps_name',
  'equip_coordonnees',
  'equip_x',
  'equip_y',
  'equip_url',
  'equip_acc_libre',
  'equip_saison',
  'equip_nature',
  'equip_rnb',
  'equip_maj_date',
  'inst_hs_bool',
] as const;

/** Opendatasoft limits (observed 400s): `limit` ≤ 100, `offset + limit` ≤ 10 000. */
export const DATA_ES_PAGE_SIZE = 100;
export const DATA_ES_MAX_WINDOW = 10_000;

export type DataEsRecord = Partial<Record<(typeof DATA_ES_FIELDS)[number], unknown>>;

/**
 * HTTP access to Data ES: explicit field selection, ordering by installation then equipment (so an installation's
 * equipments are consecutive), typed errors, no retry. Logs: operation, counts, remaining daily quota — never a record.
 */
@Injectable()
export class DataEsClient {
  static readonly TIMEOUT_MS = 10_000;

  private readonly logger = new Logger('DataEsClient');

  /**
   * One page of equipment records matching an ODSQL `where` (built by ROAM code only, never from user input).
   * Throws `RangeError` past the 10 000-record window: narrow the scope instead (e.g. per département).
   */
  async page(where: string, offset: number): Promise<{ records: DataEsRecord[]; total: number }> {
    const operation = 'records';
    if (!Number.isInteger(offset) || offset < 0 || offset + DATA_ES_PAGE_SIZE > DATA_ES_MAX_WINDOW)
      throw new RangeError(
        `Data ES offset ${offset}: past the ${DATA_ES_MAX_WINDOW}-record window, narrow the scope`,
      );
    const query = new URLSearchParams({
      select: DATA_ES_FIELDS.join(','),
      where,
      order_by: 'inst_numero,equip_numero',
      limit: String(DATA_ES_PAGE_SIZE),
      offset: String(offset),
    });
    const started = Date.now();
    try {
      const { json, quota } = await this.request(operation, query);
      if (
        typeof json !== 'object' ||
        json === null ||
        !Array.isArray((json as { results?: unknown }).results) ||
        typeof (json as { total_count?: unknown }).total_count !== 'number'
      )
        throw this.invalid(operation);
      const { results, total_count } = json as { results: unknown[]; total_count: number };
      const records = results.filter(
        (record): record is DataEsRecord => typeof record === 'object' && record !== null,
      );
      this.logger.debug(
        `${operation} ok in ${Date.now() - started} ms: ${records.length} of ${total_count}${quota}`,
      );
      return { records, total: total_count };
    } catch (error) {
      const reason = error instanceof ProviderError ? error.message : (error as Error).name;
      this.logger.warn(`${operation} failed in ${Date.now() - started} ms: ${reason}`);
      throw error;
    }
  }

  private async request(operation: string, query: URLSearchParams) {
    const key = DATA_ES_PROVIDER.key;
    let response: Response;
    try {
      response = await fetch(`${DATA_ES_RECORDS_URL}?${query.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DataEsClient.TIMEOUT_MS),
        redirect: 'error',
      });
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'TimeoutError' || name === 'AbortError')
        throw new ProviderTimeoutError(
          key,
          operation,
          `no response within ${DataEsClient.TIMEOUT_MS} ms`,
        );
      throw new ProviderUnavailableError(key, operation, 'network error');
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      const detail = `HTTP ${response.status}`;
      if (response.status === 429) {
        const reset = Date.parse(response.headers.get('x-ratelimit-reset') ?? '');
        return Promise.reject(
          new ProviderRateLimitError(
            key,
            operation,
            detail,
            Number.isFinite(reset)
              ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
              : undefined,
          ),
        );
      }
      if (response.status >= 500)
        throw new ProviderUnavailableError(key, operation, detail, response.status);
      throw new ProviderRequestError(key, operation, detail);
    }
    const remaining = response.headers.get('x-ratelimit-remaining');
    const quota = remaining && /^\d+$/.test(remaining) ? `, daily quota left ${remaining}` : '';
    try {
      return { json: (await response.json()) as unknown, quota };
    } catch {
      throw this.invalid(operation);
    }
  }

  private invalid(operation: string) {
    return new ProviderResponseError(
      DATA_ES_PROVIDER.key,
      operation,
      'response does not match the documented shape',
    );
  }
}
