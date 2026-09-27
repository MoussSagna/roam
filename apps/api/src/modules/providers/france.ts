/**
 * French administrative facts shared by the open-data providers (DATAtourisme, Basilic, Data ES) — DATA-6.
 */

/** IANA time zone of a département (INSEE code): metropolitan France and Corsica, overseas départements. */
const OVERSEAS_ZONES: Record<string, string> = {
  '971': 'America/Guadeloupe',
  '972': 'America/Martinique',
  '973': 'America/Cayenne',
  '974': 'Indian/Reunion',
  '975': 'America/Miquelon',
  '976': 'Indian/Mayotte',
  '977': 'America/St_Barthelemy',
  '978': 'America/Marigot',
  '986': 'Pacific/Wallis',
  '987': 'Pacific/Tahiti',
  '988': 'Pacific/Noumea',
};

/** Unknown département → `null` (a local time then stays local: never an assumed zone). */
export function timeZoneOfDepartment(code: string | null | undefined): string | null {
  if (!code) return null;
  if (OVERSEAS_ZONES[code]) return OVERSEAS_ZONES[code];
  if (/^(0[1-9]|[1-8]\d|9[0-5]|2A|2B)$/.test(code)) return 'Europe/Paris';
  return null;
}

/** The département of an INSEE commune code ("75111" → "75", "97411" → "974", "2A004" → "2A"). */
export function departmentOfCommune(insee: string | null | undefined): string | null {
  if (!insee || !/^(\d{5}|2[AB]\d{3})$/.test(insee)) return null;
  return insee.startsWith('97') || insee.startsWith('98') ? insee.slice(0, 3) : insee.slice(0, 2);
}

/** "Paris 11e Arrondissement" → "Paris" (also Lyon, Marseille); other names unchanged. */
export function communeName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const match = /^(Paris|Lyon|Marseille)\s+\d{1,2}(?:e|er|ème)\s+arrondissement$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

type Box = { minLat: number; maxLat: number; minLon: number; maxLon: number };
const METROPOLE: Box = { minLat: 41.2, maxLat: 51.2, minLon: -5.3, maxLon: 9.7 };
const OVERSEAS_BOXES: Record<string, Box> = {
  '971': { minLat: 15.8, maxLat: 16.6, minLon: -61.9, maxLon: -60.9 },
  '972': { minLat: 14.3, maxLat: 14.9, minLon: -61.3, maxLon: -60.8 },
  '973': { minLat: 2.1, maxLat: 5.8, minLon: -54.7, maxLon: -51.6 },
  '974': { minLat: -21.4, maxLat: -20.8, minLon: 55.2, maxLon: 55.9 },
  '975': { minLat: 46.7, maxLat: 47.2, minLon: -56.5, maxLon: -56.1 },
  '976': { minLat: -13.1, maxLat: -12.6, minLon: 44.9, maxLon: 45.4 },
};

/**
 * Coordinates plausible for the département: inside metropolitan France for a metropolitan one, inside the territory
 * for an overseas one (e.g. Basilic's swapped Saint-Pierre-et-Miquelon points are refused, not "fixed"). Unknown
 * départements: a valid latitude/longitude is enough.
 */
export function plausibleCoordinates(
  latitude: number,
  longitude: number,
  department: string | null,
): boolean {
  if (!(latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180)) return false;
  const box =
    department && OVERSEAS_BOXES[department]
      ? OVERSEAS_BOXES[department]
      : department && timeZoneOfDepartment(department) === 'Europe/Paris'
        ? METROPOLE
        : null;
  if (!box) return true;
  return (
    latitude >= box.minLat &&
    latitude <= box.maxLat &&
    longitude >= box.minLon &&
    longitude <= box.maxLon
  );
}

/** A website as a URL: "www.x.fr" → "https://www.x.fr"; anything else that is not http(s) → null. */
export function websiteUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}
