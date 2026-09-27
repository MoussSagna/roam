import { communeName, plausibleCoordinates } from '../france.js';
import type { NormalizedPlace } from '../provider.types.js';
import { BASILIC_PROVIDER } from './basilic.client.js';

/**
 * Basilic types kept as ROAM places (OPEN_DATA_SOURCES.md §5): visitable cultural venues and gardens. Monuments
 * (mostly private buildings), libraries, bookshops, press shops, archives, schools are not outings: skipped.
 */
export const BASILIC_TYPE_CATEGORIES: Record<string, string> = {
  Musée: 'culture',
  Théâtre: 'culture',
  Scène: 'culture',
  Opéra: 'culture',
  Cinéma: 'culture',
  "Centre d'art": 'culture',
  'Centre culturel': 'culture',
  'Lieu de mémoire': 'culture',
  'Parc et jardin': 'park',
};

/** The publisher's own exit notes ("sorti de la base", "désactivé", …): an explicit obsolescence signal. */
const EXIT_NOTE = /sorti|d[ée]sactiv|inactiv|d[ée]-?labellis/i;

export const BASILIC_ATTRIBUTION = 'Ministère de la Culture (DEPS) — base Basilic';

export type BasilicMapping = { place: NormalizedPlace } | { skipped: string };

/**
 * One Basilic row → NormalizedPlace. Identity: `Identifiant_deps_a_partir_de_2022` — the publisher's documented id.
 * It embeds the label code, so a relabelled site may come back under a new id (a duplicate, never a wrong merge);
 * `Rang`, its stable-looking suffix, is not documented as an identifier and is not used as identity
 * (DATA_PERSISTENCE_AND_SYNC.md "Basilic").
 */
export function mapBasilicRow(
  row: Record<string, string>,
  fileDate: Date | null,
  departments?: ReadonlySet<string>,
): BasilicMapping {
  const department = row['N_Département']?.trim() || null;
  if (departments && (!department || !departments.has(department)))
    return { skipped: 'out_of_scope' };
  const type = row['Type équipement ou lieu']?.trim();
  const category = type ? BASILIC_TYPE_CATEGORIES[type] : undefined;
  if (!category) return { skipped: 'type_not_an_outing' };
  const externalId = row['Identifiant_deps_a_partir_de_2022']?.trim();
  if (!externalId) return { skipped: 'no_id' };
  const name = row['Nom']?.trim();
  if (!name) return { skipped: 'no_name' };
  const latitude = Number(row['Latitude']);
  const longitude = Number(row['Longitude']);
  if (
    !row['Latitude']?.trim() ||
    !row['Longitude']?.trim() ||
    !plausibleCoordinates(latitude, longitude, department)
  )
    return { skipped: 'implausible_coordinates' };

  const street = row['Adresse']?.trim();
  const postalCode = row['Code Postal']?.trim();
  const city = communeName(row['libelle_geographique']);
  return {
    place: {
      source: {
        providerKey: BASILIC_PROVIDER.key,
        externalId,
        externalUrl: null,
        providerCategories: [type, row['Label et appellation'], row['Domaine'], row['Sous_domaine']]
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      },
      name,
      address: street ? [street, [postalCode, city].filter(Boolean).join(' ')].join(', ') : null,
      city,
      latitude,
      longitude,
      priceLevel: 'UNKNOWN',
      rating: null,
      reviewCount: null,
      isActive: !EXIT_NOTE.test(row['Demographie_detail_sortie'] ?? ''),
      categorySlugs: [category],
      attribution: BASILIC_ATTRIBUTION,
      providerUpdatedAt: fileDate,
    },
  };
}
