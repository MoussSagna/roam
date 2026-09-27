/**
 * Cross-provider place deduplication rules (DATA_PERSISTENCE_AND_SYNC.md "Deduplication") — pure functions, no
 * database. The exact provider identity `(provider, externalId)` is checked before these rules (it is a unique key);
 * they only decide whether a record **new to ROAM** is a place another provider already brought.
 *
 * A wrong merge is worse than a duplicate: it mixes two places' facts, sources and history, and cannot be undone
 * automatically. So a merge needs two independent signals, and any ambiguity keeps the places apart:
 *
 * 1. **RNB** — the same Référentiel National des Bâtiments id **and** compatible names (one building can hold a museum
 *    and a café) **and** at most `RNB_MAX_DISTANCE_M` apart;
 * 2. **proximity** — at most `PROXIMITY_MAX_DISTANCE_M` apart **and** the same normalized name;
 * 3. otherwise, or when several candidates qualify: no merge.
 *
 * Never on a name, an address or coordinates alone.
 */

/** Two records of one building are at most this far apart (building centroid vs. entrance or equipment). */
export const RNB_MAX_DISTANCE_M = 150;
/** Without a shared building id: same name and practically the same point. */
export const PROXIMITY_MAX_DISTANCE_M = 30;
/** Share of the shorter name's words the other must contain for an RNB match. */
export const RNB_NAME_OVERLAP = 0.5;

/** Words that do not identify a place ("Le Café de la Paix" ≈ "Café Paix"). */
const STOP_WORDS = new Set([
  'le',
  'la',
  'les',
  'l',
  'de',
  'du',
  'des',
  'd',
  'et',
  'a',
  'au',
  'aux',
  'en',
  'the',
  'of',
  'and',
]);

/** Lower case, no accents, no punctuation, no stop words: "Musée d'Orsay" → "musee orsay". */
export function normalizePlaceName(name: string): string {
  return nameTokens(name).join(' ');
}

export function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Names that can designate the same place: most words of the shorter one appear in the other. */
export function compatibleNames(a: string, b: string): boolean {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (left.size === 0 || right.size === 0) return false;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;
  for (const word of small) if (large.has(word)) shared += 1;
  return shared / small.size >= RNB_NAME_OVERLAP;
}

/** The record being imported. */
export type MatchSubject = {
  providerKey: string;
  name: string;
  latitude: number;
  longitude: number;
  rnbId: string | null;
};

/** An existing place near the subject or in the same building, with the providers of its sources. */
export type MatchCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rnbId: string | null;
  providerKeys: string[];
};

export type MatchDecision =
  { placeId: string; rule: 'rnb' | 'proximity' } | { placeId: null; rule: 'none' | 'ambiguous' };

/**
 * Decides whether the subject is one of the candidates. A candidate is never eligible when it already has a record
 * from the same provider (that provider says they are different places) or when it belongs to a protected catalog
 * (e.g. the curated DATA-1 places, `protectedProviderKeys`).
 */
export function matchPlace(
  subject: MatchSubject,
  candidates: MatchCandidate[],
  protectedProviderKeys: ReadonlySet<string>,
): MatchDecision {
  const eligible = candidates.filter(
    (candidate) =>
      !candidate.providerKeys.includes(subject.providerKey) &&
      !candidate.providerKeys.some((key) => protectedProviderKeys.has(key)),
  );

  const byRnb = subject.rnbId
    ? eligible.filter(
        (candidate) =>
          candidate.rnbId === subject.rnbId &&
          compatibleNames(candidate.name, subject.name) &&
          distanceMeters(candidate, subject) <= RNB_MAX_DISTANCE_M,
      )
    : [];
  if (byRnb.length > 1) return { placeId: null, rule: 'ambiguous' };
  if (byRnb.length === 1) return { placeId: byRnb[0].id, rule: 'rnb' };

  const name = normalizePlaceName(subject.name);
  const byProximity = eligible.filter(
    (candidate) =>
      name.length > 0 &&
      normalizePlaceName(candidate.name) === name &&
      distanceMeters(candidate, subject) <= PROXIMITY_MAX_DISTANCE_M &&
      // Two different buildings are two different places, whatever their names.
      !(candidate.rnbId && subject.rnbId && candidate.rnbId !== subject.rnbId),
  );
  if (byProximity.length > 1) return { placeId: null, rule: 'ambiguous' };
  if (byProximity.length === 1) return { placeId: byProximity[0].id, rule: 'proximity' };
  return { placeId: null, rule: 'none' };
}

/** Degrees of latitude/longitude around a point that contain a circle of `meters` (candidate pre-filter). */
export function boundingBox(latitude: number, longitude: number, meters: number) {
  const dLat = meters / 111_320;
  const dLon = meters / (111_320 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
  return {
    minLatitude: latitude - dLat,
    maxLatitude: latitude + dLat,
    minLongitude: longitude - dLon,
    maxLongitude: longitude + dLon,
  };
}
