import { Injectable, Logger } from '@nestjs/common';

import {
  ProviderError,
  ProviderNotFoundError,
  ProviderRequestError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../provider.errors.js';
import { readCsvObjects } from './csv.js';

export const BASILIC_PROVIDER = {
  key: 'basilic',
  name: 'Basilic (Ministère de la Culture)',
} as const;

/**
 * The data.gouv.fr stable link of the Basilic CSV resource: it redirects to the current file (OPEN_DATA_SOURCES.md
 * §2.2). No key.
 */
export const BASILIC_RESOURCE_URL =
  'https://www.data.gouv.fr/api/1/datasets/r/dced78ee-0823-4b61-86e6-57717308d4e4';
const ALLOWED_HOSTS = new Set(['www.data.gouv.fr', 'static.data.gouv.fr']);

/** The columns ROAM reads: a file without them is not the documented dataset. */
export const BASILIC_REQUIRED_COLUMNS = [
  'Nom',
  'Adresse',
  'Code Postal',
  'libelle_geographique',
  'code_insee',
  'Identifiant_deps_a_partir_de_2022',
  'Rang',
  'Type équipement ou lieu',
  'Label et appellation',
  'Domaine',
  'Sous_domaine',
  'Latitude',
  'Longitude',
  'N_Département',
  'Demographie_detail_sortie',
] as const;

/** The published file is 49 MB; beyond this the download is refused. */
export const BASILIC_MAX_BYTES = 200 * 1024 * 1024;

export type BasilicFile = {
  /** File date (HTTP Last-Modified): the dataset's date of last update. */
  lastModified: Date | null;
  rows: AsyncIterable<Record<string, string>>;
  cancel(): Promise<void>;
};

/**
 * Controlled download of the Basilic CSV: https only, data.gouv.fr hosts only, size guard, header validation, rows
 * streamed (`;`-separated, UTF-8) — never the whole file in memory. No retry here (the sync orchestrator reopens).
 */
@Injectable()
export class BasilicClient {
  /** Whole-file transfer budget (49 MB). */
  static readonly TIMEOUT_MS = 300_000;

  private readonly logger = new Logger('BasilicClient');

  async open(): Promise<BasilicFile> {
    const operation = 'download';
    const key = BASILIC_PROVIDER.key;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BasilicClient.TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(BASILIC_RESOURCE_URL, {
        headers: { Accept: 'text/csv' },
        signal: controller.signal,
        redirect: 'follow',
      });
    } catch (error) {
      clearTimeout(timer);
      if ((error as Error).name === 'AbortError')
        throw new ProviderTimeoutError(key, operation, 'download timed out');
      throw new ProviderUnavailableError(key, operation, 'network error');
    }
    const fail = (error: ProviderError) => {
      clearTimeout(timer);
      void response.body?.cancel().catch(() => undefined);
      this.logger.warn(`${operation} failed: ${error.name} — ${error.message}`);
      return error;
    };
    if (!response.ok) {
      const detail = `HTTP ${response.status}`;
      if (response.status === 404) throw fail(new ProviderNotFoundError(key, operation, detail));
      if (response.status >= 500)
        throw fail(new ProviderUnavailableError(key, operation, detail, response.status));
      throw fail(new ProviderRequestError(key, operation, detail));
    }
    const finalUrl = new URL(response.url || BASILIC_RESOURCE_URL);
    if (finalUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(finalUrl.hostname))
      throw fail(new ProviderResponseError(key, operation, 'redirected outside data.gouv.fr'));
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > BASILIC_MAX_BYTES)
      throw fail(new ProviderResponseError(key, operation, 'file larger than expected'));
    if (!response.body) throw fail(new ProviderResponseError(key, operation, 'empty body'));

    const lastModified = new Date(response.headers.get('last-modified') ?? '');
    const body = response.body;
    const logger = this.logger;

    async function* chunks(): AsyncGenerator<string> {
      const decoder = new TextDecoder('utf-8');
      let bytes = 0;
      try {
        for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
          bytes += chunk.byteLength;
          if (bytes > BASILIC_MAX_BYTES)
            throw new ProviderResponseError(key, operation, 'file larger than expected');
          yield decoder.decode(chunk, { stream: true });
        }
        yield decoder.decode();
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        if ((error as Error).name === 'AbortError')
          throw new ProviderTimeoutError(key, operation, 'download timed out');
        throw new ProviderUnavailableError(key, operation, 'download interrupted');
      } finally {
        clearTimeout(timer);
        logger.debug(`${operation}: ${bytes} bytes read`);
      }
    }

    async function* rows(): AsyncGenerator<Record<string, string>> {
      let checked = false;
      for await (const row of readCsvObjects(chunks(), ';')) {
        if (!checked) {
          const missing = BASILIC_REQUIRED_COLUMNS.filter((column) => !(column in row));
          if (missing.length)
            throw new ProviderResponseError(
              key,
              operation,
              `missing columns: ${missing.join(', ')}`,
            );
          checked = true;
        }
        yield row;
      }
    }

    this.logger.debug(`${operation} started`);
    return {
      lastModified: Number.isNaN(lastModified.getTime()) ? null : lastModified,
      rows: rows(),
      cancel: () => {
        clearTimeout(timer);
        controller.abort();
        return Promise.resolve();
      },
    };
  }
}
