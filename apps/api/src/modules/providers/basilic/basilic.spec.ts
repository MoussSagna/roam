import { Logger } from '@nestjs/common';

import { ProviderResponseError, ProviderUnavailableError } from '../provider.errors.js';
import { BASILIC_REQUIRED_COLUMNS, BasilicClient } from './basilic.client.js';
import { basilicPlacesJob } from './basilic.jobs.js';
import { mapBasilicRow } from './basilic.mapper.js';
import { readCsv } from './csv.js';

async function* from(...chunks: string[]) {
  for (const chunk of chunks) yield await Promise.resolve(chunk);
}
async function all<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

const HEADER = BASILIC_REQUIRED_COLUMNS.join(';');
const row = (
  overrides: Partial<Record<(typeof BASILIC_REQUIRED_COLUMNS)[number], string>> = {},
) => {
  const values: Record<string, string> = {
    Nom: 'Théâtre de la Bastille',
    Adresse: '76 r. de la Roquette',
    'Code Postal': '75011',
    libelle_geographique: 'Paris 11e Arrondissement',
    code_insee: '75111',
    Identifiant_deps_a_partir_de_2022: 'THHL_75056_70619',
    Rang: '70619',
    'Type équipement ou lieu': 'Théâtre',
    'Label et appellation': 'Théâtre hors label',
    Domaine: 'Arts du spectacle',
    Sous_domaine: 'Théâtre',
    Latitude: '48.8557560834018',
    Longitude: '2.37563788144496',
    N_Département: '75',
    Demographie_detail_sortie: '',
    ...overrides,
  };
  return values;
};
const csvLine = (values: Record<string, string>) =>
  BASILIC_REQUIRED_COLUMNS.map((column) => values[column]).join(';');

describe('Basilic provider', () => {
  beforeEach(() => {
    for (const level of ['log', 'warn', 'debug'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CSV: BOM, quotes, doubled quotes, delimiters and newlines in quotes, CRLF, records split across chunks', async () => {
    const records = await all(
      readCsv(from('﻿a;b\r\n"x;1";"say ""hi"""\r\n"multi', '\nline";2\r\nlast;', 'row'), ';'),
    );
    expect(records).toEqual([
      ['a', 'b'],
      ['x;1', 'say "hi"'],
      ['multi\nline', '2'],
      ['last', 'row'],
    ]);
    // The real file's malformed quotes ("Maison dite " de …") are read leniently: the row keeps its columns.
    expect(await all(readCsv(from('"Maison dite " de X";y\n'), ';'))).toEqual([
      ['Maison dite  de X"', 'y'],
    ]);
  });

  it('maps a visitable venue: identity = publisher id, commune without arrondissement, category, attribution', () => {
    const mapped = mapBasilicRow(row(), new Date('2026-02-18T08:43:42Z'));
    expect(mapped).toMatchObject({
      place: {
        source: {
          providerKey: 'basilic',
          externalId: 'THHL_75056_70619',
          externalUrl: null,
          providerCategories: ['Théâtre', 'Théâtre hors label', 'Arts du spectacle', 'Théâtre'],
        },
        name: 'Théâtre de la Bastille',
        address: '76 r. de la Roquette, 75011 Paris',
        city: 'Paris',
        categorySlugs: ['culture'],
        isActive: true,
        rating: null,
        attribution: 'Ministère de la Culture (DEPS) — base Basilic',
        providerUpdatedAt: new Date('2026-02-18T08:43:42Z'),
      },
    });
  });

  it('skips: types that are not outings, out-of-scope départements, missing id, implausible coordinates (swapped lat/lon)', () => {
    expect(mapBasilicRow(row({ 'Type équipement ou lieu': 'Bibliothèque' }), null)).toEqual({
      skipped: 'type_not_an_outing',
    });
    expect(mapBasilicRow(row({ N_Département: '69' }), null, new Set(['75']))).toEqual({
      skipped: 'out_of_scope',
    });
    expect(mapBasilicRow(row({ Identifiant_deps_a_partir_de_2022: '' }), null)).toEqual({
      skipped: 'no_id',
    });
    // Saint-Pierre-et-Miquelon rows with latitude and longitude swapped (observed): refused, never "fixed".
    expect(
      mapBasilicRow(
        row({
          N_Département: '975',
          Latitude: '-56.1593049032879',
          Longitude: '46.7749842239151',
          'Type équipement ou lieu': 'Musée',
        }),
        null,
      ),
    ).toEqual({ skipped: 'implausible_coordinates' });
  });

  it("the publisher's exit note is an explicit obsolescence signal", () => {
    const mapped = mapBasilicRow(
      row({ Demographie_detail_sortie: 'sorti de la base en 2022' }),
      null,
    );
    expect(mapped).toMatchObject({ place: { isActive: false } });
  });

  it('download: data.gouv.fr only, header validated', async () => {
    const client = new BasilicClient();
    const response = (body: string) =>
      new Response(body, { headers: { 'last-modified': 'Wed, 18 Feb 2026 08:43:42 GMT' } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(response(`${HEADER}\n${csvLine(row())}\n`));
    const file = await client.open();
    expect(file.lastModified).toEqual(new Date('2026-02-18T08:43:42Z'));
    expect(await all(file.rows)).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://www.data.gouv.fr/api/1/datasets/r/dced78ee-0823-4b61-86e6-57717308d4e4',
    );

    fetchMock.mockResolvedValueOnce(response('Nom;Autre\nx;y\n'));
    await expect(all((await client.open()).rows)).rejects.toBeInstanceOf(ProviderResponseError);
  });

  it('job: batches of rows with a row cursor; after a broken download it reopens and skips what was consumed', async () => {
    const lines = Array.from({ length: 1200 }, (_, i) =>
      csvLine(row({ Identifiant_deps_a_partir_de_2022: `THHL_75056_${i}`, Rang: String(i) })),
    );
    let opens = 0;
    const client = {
      open: vi.fn(() => {
        opens += 1;
        const failing = opens === 1;
        async function* rows() {
          for (const [index, line] of lines.entries()) {
            if (failing && index === 700)
              throw new ProviderUnavailableError('basilic', 'download', 'download interrupted');
            const values = line.split(';');
            yield await Promise.resolve(
              Object.fromEntries(BASILIC_REQUIRED_COLUMNS.map((column, i) => [column, values[i]])),
            );
          }
        }
        return Promise.resolve({
          lastModified: null,
          rows: rows(),
          cancel: () => Promise.resolve(),
        });
      }),
    } as unknown as BasilicClient;

    const pace = vi.fn(() => Promise.resolve());
    const reader = basilicPlacesJob(client, { name: 't', departments: ['75'] }).open(null, {
      lastSuccessAt: null,
      now: new Date(),
      pace,
    });
    const first = await reader.next();
    expect(first).toMatchObject({ cursor: { row: 500 } });
    expect(first!.items).toHaveLength(500);
    await expect(reader.next()).rejects.toBeInstanceOf(ProviderUnavailableError);
    // Retry (the orchestrator calls next again): a new download, the first 500 rows skipped, not re-ingested.
    const second = await reader.next();
    expect(second).toMatchObject({ cursor: { row: 1000 } });
    expect(second!.items[0].source.externalId).toBe('THHL_75056_500');
    const third = await reader.next();
    expect(third).toMatchObject({ cursor: null });
    expect(third!.items).toHaveLength(200);
    expect(await reader.next()).toBeNull();
    expect(opens).toBe(2);
    // Paced per download (a provider request), never per batch of rows: 2 downloads for 3 batches.
    expect(pace).toHaveBeenCalledTimes(2);

    // A resumed run starts from its saved cursor.
    const resumed = basilicPlacesJob(client, { name: 't' }).open(
      { row: 1100 },
      { lastSuccessAt: null, now: new Date(), pace: () => Promise.resolve() },
    );
    expect((await resumed.next())!.items[0].source.externalId).toBe('THHL_75056_1100');
  });
});
