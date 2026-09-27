import type { PlaceSyncJob, SyncBatch, SyncReader } from '../../sync/sync.types.js';
import type { NormalizedPlace } from '../provider.types.js';
import { DATA_ES_PAGE_SIZE, DATA_ES_PROVIDER, type DataEsClient } from './data-es.client.js';
import { groupByInstallation, mapDataEsInstallation } from './data-es.mapper.js';

export type DataEsScope = {
  /** Job name part, e.g. "paris". */
  name: string;
  /** Départements (dep_code), e.g. ["75"]; each run must stay under the API's 10 000-record window. */
  departments: string[];
  /** Keep only installations with at least one free-access equipment (outings, not club pitches). */
  freeAccessOnly?: boolean;
};

export function dataEsWhere(scope: DataEsScope): string {
  if (
    !scope.departments.length ||
    scope.departments.some((code) => !/^(\d{2,3}|2[AB])$/.test(code))
  )
    throw new RangeError('Data ES scope: invalid départements');
  const departments = scope.departments.map((code) => `"${code}"`).join(', ');
  return `dep_code in (${departments})${
    // A text field in `data-es` ("true"/"false", observed): compared as text.
    scope.freeAccessOnly ? ' and equip_acc_libre = "true"' : ''
  }`;
}

/**
 * Data ES pages for the sync: equipments ordered by installation, grouped into installations; an installation cut by
 * a page boundary is read again from its first equipment on the next page. Cursor = `{ offset }` of the first
 * equipment not yet turned into a place. Past 10 000 records the client refuses: split the scope.
 */
function dataEsReader(
  client: DataEsClient,
  where: string,
  start: number,
  pace: () => Promise<void>,
): SyncReader<NormalizedPlace> {
  let offset = start;
  let done = false;
  return {
    async next(): Promise<SyncBatch<NormalizedPlace> | null> {
      if (done) return null;
      await pace();
      const { records, total } = await client.page(where, offset);
      const last = records.length < DATA_ES_PAGE_SIZE || offset + records.length >= total;
      let { complete, pending } = groupByInstallation(records, last);
      // A single installation filling a whole page: take it as is rather than loop.
      if (complete.length === 0 && pending.length) {
        complete = [pending];
        pending = [];
      }
      const items: NormalizedPlace[] = [];
      const skipped: Record<string, number> = {};
      for (const group of complete) {
        const mapped = mapDataEsInstallation(group);
        if ('place' in mapped) items.push(mapped.place);
        else skipped[mapped.skipped] = (skipped[mapped.skipped] ?? 0) + 1;
      }
      offset += records.length - pending.length;
      done = last;
      return { items, skipped, cursor: done ? null : { offset } };
    },
  };
}

export function dataEsPlacesJob(client: DataEsClient, scope: DataEsScope): PlaceSyncJob {
  const where = dataEsWhere(scope);
  return {
    key: `data_es:places:${scope.name}`,
    provider: DATA_ES_PROVIDER,
    entity: 'PLACE',
    open: (cursor, context) => {
      const offset =
        cursor &&
        typeof cursor === 'object' &&
        !Array.isArray(cursor) &&
        typeof cursor.offset === 'number'
          ? cursor.offset
          : 0;
      return dataEsReader(client, where, offset, context.pace);
    },
  };
}
