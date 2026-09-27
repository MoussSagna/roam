import { Logger } from '@nestjs/common';

import { ProviderRateLimitError } from '../provider.errors.js';
import { DataEsAdapter } from './data-es.adapter.js';
import {
  DATA_ES_FIELDS,
  DATA_ES_RECORDS_URL,
  DataEsClient,
  type DataEsRecord,
} from './data-es.client.js';
import { dataEsPlacesJob, dataEsWhere } from './data-es.jobs.js';
import { groupByInstallation, mapDataEsInstallation } from './data-es.mapper.js';

const equipment = (
  inst: string,
  n: number,
  overrides: Partial<DataEsRecord> = {},
): DataEsRecord => ({
  equip_numero: `E${String(n).padStart(3, '0')}${inst}`,
  inst_numero: inst,
  inst_nom: 'CENTRE DE DANSE DU MARAIS',
  equip_nom: `SALLE ${n}`,
  inst_adresse: '41 RUE DU TEMPLE',
  inst_cp: '75004',
  new_name: 'Paris 4e Arrondissement',
  new_code: '75104',
  dep_code: '75',
  equip_type_name: 'Salle de danse',
  equip_type_famille: 'Salle ou terrain spécialisé',
  aps_name: ['Autres Danses'],
  equip_x: 2.35353,
  equip_y: 48.85973,
  equip_url: 'www.paris-danse.fr',
  equip_acc_libre: 'false',
  equip_rnb: 'RSG61ZP8B87A',
  equip_maj_date: '2025-03-31',
  inst_hs_bool: null,
  ...overrides,
});
/** What the portal's other dataset (`data-es-equipement`) exposes: personal data ROAM must never keep. */
const PERSONAL = {
  declarant_nom: 'Dupont',
  declarant_prenom: 'Jean',
  declarant_mail: 'jean@example.fr',
  declarant_telephone: '0600000000',
};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('Data ES provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const level of ['log', 'warn', 'debug'] as const)
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('privacy: only the data-es dataset, and an explicit field list with no personal data', async () => {
    expect(DATA_ES_RECORDS_URL).toMatch(/\/datasets\/data-es\/records$/);
    for (const field of DATA_ES_FIELDS)
      expect(field).not.toMatch(/declarant|prop_nom|siret|mail|tel|phone|prenom/i);
    fetchMock.mockResolvedValue(json({ total_count: 0, results: [] }));
    await new DataEsClient().page('dep_code in ("75")', 0);
    const url = new URL((fetchMock.mock.calls[0] as [string])[0]);
    expect(url.pathname).toBe('/api/explore/v2.1/catalog/datasets/data-es/records');
    expect(url.searchParams.get('select')).toBe(DATA_ES_FIELDS.join(','));
    expect(url.searchParams.get('order_by')).toBe('inst_numero,equip_numero');
  });

  it('privacy: personal fields in a response never reach the normalized place', () => {
    const mapped = mapDataEsInstallation([{ ...equipment('I751040010', 1), ...PERSONAL }]);
    const serialized = JSON.stringify(mapped);
    for (const value of Object.values(PERSONAL)) expect(serialized).not.toContain(value);
  });

  it('one installation = one place: first located equipment, website with a scheme, RNB, free access, update date', () => {
    const mapped = mapDataEsInstallation([
      equipment('I751040010', 2, { equip_x: null, equip_y: null }),
      equipment('I751040010', 14, {
        equip_acc_libre: 'true',
        equip_maj_date: '2026-02-01',
        equip_type_name: 'Salle de musculation',
      }),
    ]);
    expect(mapped).toMatchObject({
      place: {
        source: { providerKey: 'data_es', externalId: 'I751040010', externalUrl: null },
        name: 'CENTRE DE DANSE DU MARAIS',
        address: '41 RUE DU TEMPLE, 75004 Paris',
        city: 'Paris',
        latitude: 48.85973,
        longitude: 2.35353,
        website: 'https://www.paris-danse.fr/',
        rnbId: 'RSG61ZP8B87A',
        categorySlugs: [],
        attributes: { equipmentCount: 2, freeAccess: true },
        isActive: true,
        providerUpdatedAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    });
    const place = 'place' in mapped ? mapped.place : undefined;
    expect(place?.source.providerCategories).toEqual([
      'Salle ou terrain spécialisé',
      'Salle de danse',
      'Autres Danses',
      'Salle de musculation',
    ]);
  });

  it('coordinates as the real API sends them: the geo point, or equip_x/equip_y as text', () => {
    const fromPoint = mapDataEsInstallation([
      equipment('I751040010', 1, {
        equip_x: null,
        equip_y: null,
        equip_coordonnees: { lon: 2.298588, lat: 48.829465 },
      }),
    ]);
    expect(fromPoint).toMatchObject({ place: { latitude: 48.829465, longitude: 2.298588 } });
    const fromText = mapDataEsInstallation([
      equipment('I751040010', 1, { equip_x: '2.29864', equip_y: '48.89038' }),
    ]);
    expect(fromText).toMatchObject({ place: { latitude: 48.89038, longitude: 2.29864 } });
  });

  it('out-of-service installation → inactive (any casing); no coordinates → skipped', () => {
    expect(
      mapDataEsInstallation([equipment('I751040010', 1, { inst_hs_bool: 'OUI' })]),
    ).toMatchObject({ place: { isActive: false } });
    expect(mapDataEsInstallation([equipment('I751040010', 1, { equip_x: null })])).toEqual({
      skipped: 'no_coordinates',
    });
  });

  it('groups consecutive equipments; the last group of a full page is pending', () => {
    const records = [equipment('I1', 1), equipment('I1', 2), equipment('I2', 1)];
    expect(groupByInstallation(records, false)).toEqual({
      complete: [records.slice(0, 2)],
      pending: [records[2]],
    });
    expect(groupByInstallation(records, true).complete).toHaveLength(2);
  });

  it('job: an installation cut by a page boundary is read again from its first equipment (cursor = offset)', async () => {
    const pageOne = [
      ...Array.from({ length: 98 }, (_, i) => equipment(`I75104${String(i).padStart(4, '0')}`, 1)),
      equipment('I751049998', 1),
      equipment('I751049998', 2),
    ];
    const pageTwo = [
      equipment('I751049998', 1),
      equipment('I751049998', 2),
      equipment('I751049998', 3),
      equipment('I751049999', 1),
    ];
    fetchMock
      .mockResolvedValueOnce(json({ total_count: 102, results: pageOne }))
      .mockResolvedValueOnce(json({ total_count: 102, results: pageTwo }));
    const reader = dataEsPlacesJob(new DataEsClient(), { name: 't', departments: ['75'] }).open(
      null,
      { lastSuccessAt: null, now: new Date(), pace: () => Promise.resolve() },
    );
    const first = await reader.next();
    expect(first!.items).toHaveLength(98);
    expect(first!.cursor).toEqual({ offset: 98 });
    expect(new URL((fetchMock.mock.calls[0] as [string])[0]).searchParams.get('offset')).toBe('0');
    const second = await reader.next();
    expect(new URL((fetchMock.mock.calls[1] as [string])[0]).searchParams.get('offset')).toBe('98');
    expect(second!.items.map((place) => place.source.externalId)).toEqual([
      'I751049998',
      'I751049999',
    ]);
    expect(second!.items[0].attributes).toMatchObject({ equipmentCount: 3 });
    expect(second!.cursor).toBeNull();
  });

  it('scope and window: départements validated; past 10 000 records the client refuses (split the scope)', async () => {
    expect(dataEsWhere({ name: 'x', departments: ['75', '2A'], freeAccessOnly: true })).toBe(
      'dep_code in ("75", "2A") and equip_acc_libre = "true"',
    );
    expect(() => dataEsWhere({ name: 'x', departments: ['75"; drop'] })).toThrow(RangeError);
    await expect(new DataEsClient().page('x', 9_950)).rejects.toThrow(RangeError);
  });

  it('adapter: getPlace by installation id only; 429 is typed with its reset', async () => {
    const adapter = new DataEsAdapter(new DataEsClient());
    await expect(adapter.getPlace('not-an-id')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(
      json({ total_count: 1, results: [equipment('I751040010', 1)] }),
    );
    await expect(adapter.getPlace('I751040010')).resolves.toMatchObject({
      name: 'CENTRE DE DANSE DU MARAIS',
    });
    expect(new URL((fetchMock.mock.calls[0] as [string])[0]).searchParams.get('where')).toBe(
      'inst_numero = "I751040010"',
    );
    fetchMock.mockResolvedValueOnce(json({}, 429));
    await expect(adapter.getPlace('I751040010')).rejects.toBeInstanceOf(ProviderRateLimitError);
    await expect(
      adapter.searchNearby({
        latitude: 48.86,
        longitude: 2.35,
        radiusMeters: 500,
        categorySlugs: ['cafe'],
      }),
    ).resolves.toEqual([]);
  });
});
