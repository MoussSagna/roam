import type { PlaceSyncJob, SyncBatch, SyncReader } from '../../sync/sync.types.js';
import type { NormalizedPlace } from '../provider.types.js';
import { BASILIC_PROVIDER, type BasilicClient, type BasilicFile } from './basilic.client.js';
import { mapBasilicRow } from './basilic.mapper.js';

/** Rows per batch: each batch is ingested item by item, then its cursor saved. */
export const BASILIC_BATCH_ROWS = 500;

export type BasilicScope = {
  /** Job name part, e.g. "idf". */
  name: string;
  /** Départements to keep (N_Département), e.g. ["75", "92", "93", "94"]; all when omitted. */
  departments?: string[];
};

/**
 * The Basilic file as batches (DATA_PERSISTENCE_AND_SYNC.md "Basilic"): one streamed download, rows read
 * `BASILIC_BATCH_ROWS` at a time, cursor = rows consumed. After a failure (or a resumed run) the file is downloaded
 * again and the rows already consumed are skipped without being ingested again — never more than one batch in memory.
 */
function basilicReader(
  client: BasilicClient,
  scope: BasilicScope,
  cursor: number,
  pace: () => Promise<void>,
): SyncReader<NormalizedPlace> {
  let consumed = cursor;
  let file: BasilicFile | undefined;
  let iterator: AsyncIterator<Record<string, string>> | undefined;
  let done = false;
  const departments = scope.departments ? new Set(scope.departments) : undefined;

  const reset = async () => {
    await file?.cancel().catch(() => undefined);
    file = undefined;
    iterator = undefined;
  };

  return {
    async next(): Promise<SyncBatch<NormalizedPlace> | null> {
      if (done) return null;
      try {
        if (!iterator) {
          // The only provider request: one download (reading its rows sends nothing more).
          await pace();
          file = await client.open();
          iterator = file.rows[Symbol.asyncIterator]();
          for (let skipped = 0; skipped < consumed; skipped += 1) {
            if ((await iterator.next()).done) break;
          }
        }
        const items: NormalizedPlace[] = [];
        const skipped: Record<string, number> = {};
        let read = 0;
        while (read < BASILIC_BATCH_ROWS) {
          const row = await iterator.next();
          if (row.done) {
            done = true;
            break;
          }
          read += 1;
          const mapped = mapBasilicRow(row.value, file!.lastModified, departments);
          if ('place' in mapped) items.push(mapped.place);
          else skipped[mapped.skipped] = (skipped[mapped.skipped] ?? 0) + 1;
        }
        consumed += read;
        if (done) await reset();
        if (read === 0) return null;
        return { items, skipped, cursor: done ? null : { row: consumed } };
      } catch (error) {
        // The stream is broken: the next attempt downloads again and skips to `consumed`.
        await reset();
        throw error;
      }
    },
    close: reset,
  };
}

export function basilicPlacesJob(client: BasilicClient, scope: BasilicScope): PlaceSyncJob {
  return {
    key: `basilic:places:${scope.name}`,
    provider: BASILIC_PROVIDER,
    entity: 'PLACE',
    open: (cursor, context) => {
      const row =
        cursor &&
        typeof cursor === 'object' &&
        !Array.isArray(cursor) &&
        typeof cursor.row === 'number'
          ? cursor.row
          : 0;
      return basilicReader(client, scope, row, context.pace);
    },
  };
}
