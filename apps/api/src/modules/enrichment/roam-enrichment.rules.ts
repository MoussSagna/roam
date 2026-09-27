import type { JsonValue } from '../../database/json.js';
import type { Enrichment } from '../catalog/catalog.types.js';

/**
 * The deterministic ROAM enrichment rules of a place (ROAM_ENRICHMENT.md "Rules"). Pure: no I/O, no provider, no
 * randomness — the same ROAM categories always give the same enrichment, whichever provider the place came from.
 *
 * Deliberately narrow (DATA_RULES.md: never invent facts, never assume an exact duration without evidence):
 * - an atmosphere only when the category implies it **by definition** (a park is outdoors, a museum is cultural);
 * - a typical visit duration per category, always marked derived, with its rule kept in `confidence`;
 * - nothing else: energy, audience, best moments and tags are not implied by a category alone and stay
 *   `UNKNOWN`/empty until curated data, provider attributes (opening hours…) or feedback justify them.
 */

/** Bumped whenever a rule changes, so stored rule results can be told apart and refreshed. */
export const ENRICHMENT_RULES_VERSION = 1;

/** The documented atmosphere vocabulary (NORMALIZATION_AND_ENRICHMENT.md "Atmosphere examples"). */
export const DOCUMENTED_ATMOSPHERES = [
  'CHILL',
  'COZY',
  'ROMANTIC',
  'FESTIVE',
  'CULTURAL',
  'IMMERSIVE',
  'SOCIAL',
  'CREATIVE',
  'OUTDOOR',
  'QUIET',
] as const;
export type Atmosphere = (typeof DOCUMENTED_ATMOSPHERES)[number];

export type CategoryRule = {
  /** Atmospheres the category implies by definition. */
  atmosphere: readonly Atmosphere[];
  /** Typical visit duration in minutes: a ROAM estimate, never a provider fact. */
  typicalDurationMin: number;
};

/**
 * One rule per ROAM category (the DATA-1 vocabulary). `experience` has none: it names a composed outing, not a kind of
 * place, and implies nothing about one.
 */
export const CATEGORY_RULES: Readonly<Record<string, CategoryRule>> = {
  cafe: { atmosphere: [], typicalDurationMin: 45 },
  restaurant: { atmosphere: [], typicalDurationMin: 90 },
  bar: { atmosphere: [], typicalDurationMin: 90 },
  park: { atmosphere: ['OUTDOOR'], typicalDurationMin: 60 },
  culture: { atmosphere: ['CULTURAL'], typicalDurationMin: 90 },
  nature: { atmosphere: ['OUTDOOR'], typicalDurationMin: 120 },
};

/**
 * How much a rule result can be trusted, stored per field in `confidence` (NORMALIZATION_AND_ENRICHMENT.md
 * "Confidence"): a definitional atmosphere is near-certain; a category's typical duration is only an estimate.
 */
const CONFIDENCE = { definitional: 0.9, estimate: 0.5 } as const;

/** An enrichment computed by the rules: always `ROAM_RULES`. */
export type RulesEnrichment = Enrichment & { source: 'ROAM_RULES' };

/**
 * The rules' enrichment for a place of these ROAM categories, or `null` when no rule gives anything (unknown or
 * rule-less categories only). Several categories: atmospheres are merged; the duration is kept only when their typical
 * durations agree — otherwise there is no sufficient evidence and it stays `null`.
 */
export function deriveRulesEnrichment(categorySlugs: readonly string[]): RulesEnrichment | null {
  const matched = [...new Set(categorySlugs)]
    .filter((slug) => Object.hasOwn(CATEGORY_RULES, slug))
    .sort();
  if (matched.length === 0) return null;
  const rules = matched.map((slug) => CATEGORY_RULES[slug]);

  const implied = new Set(rules.flatMap((rule) => rule.atmosphere));
  const atmosphere = DOCUMENTED_ATMOSPHERES.filter((value) => implied.has(value));
  const durations = [...new Set(rules.map((rule) => rule.typicalDurationMin))];
  const estimatedDurationMin = durations.length === 1 ? durations[0] : null;
  if (atmosphere.length === 0 && estimatedDurationMin === null) return null;

  const confidence: Record<string, JsonValue> = {
    rulesVersion: ENRICHMENT_RULES_VERSION,
    categories: matched,
  };
  if (atmosphere.length > 0)
    confidence.atmosphere = {
      basis: 'category',
      rule: 'category_implies_atmosphere',
      confidence: CONFIDENCE.definitional,
    };
  if (estimatedDurationMin !== null)
    confidence.estimatedDurationMin = {
      basis: 'category',
      rule: 'category_typical_duration',
      confidence: CONFIDENCE.estimate,
    };

  return {
    atmosphere,
    energyLevel: 'UNKNOWN',
    suitableFor: [],
    bestMoments: [],
    tags: [],
    estimatedDurationMin,
    durationIsDerived: estimatedDurationMin !== null,
    source: 'ROAM_RULES',
    confidence,
  };
}
