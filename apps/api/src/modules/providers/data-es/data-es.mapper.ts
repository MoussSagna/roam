import { communeName, departmentOfCommune, plausibleCoordinates, websiteUrl } from '../france.js';
import type { NormalizedPlace } from '../provider.types.js';
import { DATA_ES_PROVIDER, type DataEsRecord } from './data-es.client.js';

export const DATA_ES_ATTRIBUTION = 'Ministère chargé des Sports — Data ES';
/** The publisher: "Toutes dates antérieures au 31 mars 2025 ne doit pas être prise en compte" (migration reset). */
const MEANINGFUL_UPDATES_FROM = '2025-03-31';
const MAX_PROVIDER_CATEGORIES = 20;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
/** Numbers arrive as numbers or, in `data-es`, as text ("2.298588", observed). */
const num = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

/** An equipment's position: the typed geo point first, else the text `equip_x`/`equip_y`. */
function position(record: DataEsRecord): { latitude: number; longitude: number } | null {
  const point = record.equip_coordonnees;
  if (typeof point === 'object' && point !== null) {
    const { lat, lon } = point as { lat?: unknown; lon?: unknown };
    const latitude = num(lat);
    const longitude = num(lon);
    if (latitude !== null && longitude !== null) return { latitude, longitude };
  }
  const latitude = num(record.equip_y);
  const longitude = num(record.equip_x);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}
/** Opendatasoft booleans arrive as "true"/"false" strings (observed) or booleans. */
const bool = (value: unknown): boolean | null =>
  value === true || value === 'true' ? true : value === false || value === 'false' ? false : null;
const texts = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).map(str).filter((item): item is string => item !== null);

/** `inst_numero`: "I" + INSEE commune of creation (5) + 4 digits (documented). */
export const INSTALLATION_ID = /^I(\d{5}|2[AB]\d{3})\d{4}$/;

export type DataEsMapping = { place: NormalizedPlace } | { skipped: string };

/**
 * One installation (its equipment records, consecutive by `inst_numero`) → NormalizedPlace. DATA-4: the installation —
 * "un lieu caractérisé par une adresse" — is the ROAM place; its equipments (each pool, court, room) are facts of it.
 * Coordinates: the first equipment (lowest `equip_numero`) that has plausible ones — no averaging. No ROAM category
 * exists for sport (a product decision, DATA_PERSISTENCE_AND_SYNC.md "Data ES"): none is set.
 */
export function mapDataEsInstallation(records: DataEsRecord[]): DataEsMapping {
  const first = records[0];
  const id = str(first?.inst_numero);
  if (!id || !INSTALLATION_ID.test(id)) return { skipped: 'no_id' };
  const name = str(first.inst_nom) ?? str(first.equip_nom);
  if (!name) return { skipped: 'no_name' };
  const department = str(first.dep_code) ?? departmentOfCommune(str(first.new_code));
  const located = records
    .map(position)
    .find((point) => point && plausibleCoordinates(point.latitude, point.longitude, department));
  if (!located) return { skipped: 'no_coordinates' };

  const street = str(first.inst_adresse);
  const city = communeName(str(first.new_name));
  const updates = records
    .map((record) => str(record.equip_maj_date)?.slice(0, 10))
    .filter((date): date is string => Boolean(date) && date! >= MEANINGFUL_UPDATES_FROM)
    .sort();
  const categories = [
    ...new Set(
      records.flatMap((record) => [
        ...texts(record.equip_type_famille),
        ...texts(record.equip_type_name),
        ...texts(record.aps_name),
      ]),
    ),
  ].slice(0, MAX_PROVIDER_CATEGORIES);
  const freeAccess = records.map((record) => bool(record.equip_acc_libre));
  const outOfService = records.some((record) => /^oui$/i.test(str(record.inst_hs_bool) ?? ''));

  return {
    place: {
      source: {
        providerKey: DATA_ES_PROVIDER.key,
        externalId: id,
        externalUrl: null,
        providerCategories: categories,
      },
      name,
      address: street
        ? [street, [str(first.inst_cp), city].filter(Boolean).join(' ')].join(', ')
        : null,
      city,
      latitude: located.latitude,
      longitude: located.longitude,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      // "Installation hors-service" is the publisher's explicit closure signal.
      isActive: !outOfService,
      categorySlugs: [],
      website: records.map((record) => websiteUrl(str(record.equip_url))).find(Boolean) ?? null,
      rnbId:
        records
          .map((record) => str(record.equip_rnb))
          .find((rnb) => rnb && /^[A-Z0-9]{12}$/.test(rnb)) ?? null,
      attributes: {
        equipmentCount: records.length,
        ...(freeAccess.some((value) => value !== null)
          ? { freeAccess: freeAccess.some((value) => value === true) }
          : {}),
      },
      attribution: DATA_ES_ATTRIBUTION,
      providerUpdatedAt: updates.length ? new Date(`${updates.at(-1)}T00:00:00.000Z`) : null,
    },
  };
}

/**
 * Groups consecutive equipment records by installation. The last group of a full page may continue on the next page:
 * it is returned apart (`pending`) unless the page is the last one.
 */
export function groupByInstallation(
  records: DataEsRecord[],
  lastPage: boolean,
): { complete: DataEsRecord[][]; pending: DataEsRecord[] } {
  const groups: DataEsRecord[][] = [];
  for (const record of records) {
    const current = groups.at(-1);
    if (current && current[0].inst_numero === record.inst_numero) current.push(record);
    else groups.push([record]);
  }
  if (lastPage || groups.length === 0) return { complete: groups, pending: [] };
  return { complete: groups.slice(0, -1), pending: groups.at(-1)! };
}
