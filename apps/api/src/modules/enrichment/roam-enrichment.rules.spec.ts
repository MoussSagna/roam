import { Audience, EnergyLevel, Moment } from '../../generated/prisma/enums.js';
import { GEOAPIFY_CATEGORY_TO_CATEGORY } from '../providers/geoapify/geoapify.mapper.js';
import { GOOGLE_TYPE_TO_CATEGORY } from '../providers/google-places/google-places.mapper.js';
import {
  CATEGORY_RULES,
  DOCUMENTED_ATMOSPHERES,
  deriveRulesEnrichment,
  ENRICHMENT_RULES_VERSION,
} from './roam-enrichment.rules.js';

/** The ROAM categories of DATA-1 (catalog seed). */
const ROAM_CATEGORIES = ['cafe', 'park', 'restaurant', 'bar', 'culture', 'nature', 'experience'];

const EMPTY_CONTEXT = {
  energyLevel: 'UNKNOWN',
  suitableFor: [],
  bestMoments: [],
  tags: [],
  source: 'ROAM_RULES',
};

describe('deriveRulesEnrichment', () => {
  it.each([
    ['cafe', [], 45],
    ['restaurant', [], 90],
    ['bar', [], 90],
    ['park', ['OUTDOOR'], 60],
    ['culture', ['CULTURAL'], 90],
    ['nature', ['OUTDOOR'], 120],
  ])('%s → atmosphere %o, derived duration %i min', (slug, atmosphere, duration) => {
    const enrichment = deriveRulesEnrichment([slug]);

    expect(enrichment).toMatchObject({
      ...EMPTY_CONTEXT,
      atmosphere,
      estimatedDurationMin: duration,
      durationIsDerived: true,
    });
    expect(enrichment?.confidence).toMatchObject({
      rulesVersion: ENRICHMENT_RULES_VERSION,
      categories: [slug],
      estimatedDurationMin: {
        basis: 'category',
        rule: 'category_typical_duration',
        confidence: 0.5,
      },
    });
    if (atmosphere.length > 0)
      expect(enrichment?.confidence).toMatchObject({
        atmosphere: { basis: 'category', rule: 'category_implies_atmosphere', confidence: 0.9 },
      });
    else expect(enrichment?.confidence).not.toHaveProperty('atmosphere');
  });

  it('never infers energy, audience, moments or tags from a category (no evidence)', () => {
    for (const slug of Object.keys(CATEGORY_RULES))
      expect(deriveRulesEnrichment([slug])).toMatchObject(EMPTY_CONTEXT);
  });

  it('never gives a restaurant or a bar a mood-like atmosphere (romantic, festive, social…)', () => {
    expect(deriveRulesEnrichment(['restaurant'])?.atmosphere).toEqual([]);
    expect(deriveRulesEnrichment(['bar'])?.atmosphere).toEqual([]);
    expect(deriveRulesEnrichment(['cafe'])?.atmosphere).toEqual([]);
  });

  it('no category, unknown or rule-less categories → no enrichment', () => {
    expect(deriveRulesEnrichment([])).toBeNull();
    expect(deriveRulesEnrichment(['experience'])).toBeNull();
    expect(deriveRulesEnrichment(['unknown', 'museum', 'toString', '__proto__'])).toBeNull();
  });

  it('unknown categories next to known ones are ignored', () => {
    expect(deriveRulesEnrichment(['park', 'unknown', 'experience'])).toMatchObject({
      atmosphere: ['OUTDOOR'],
      estimatedDurationMin: 60,
      confidence: { categories: ['park'] },
    });
  });

  it('several categories: atmospheres merged; duration kept only when the typical durations agree', () => {
    expect(deriveRulesEnrichment(['restaurant', 'bar'])).toMatchObject({
      atmosphere: [],
      estimatedDurationMin: 90,
      durationIsDerived: true,
    });

    const parkAndCulture = deriveRulesEnrichment(['park', 'culture']);
    expect(parkAndCulture).toMatchObject({
      atmosphere: ['CULTURAL', 'OUTDOOR'],
      estimatedDurationMin: null,
      durationIsDerived: false,
    });
    expect(parkAndCulture?.confidence).not.toHaveProperty('estimatedDurationMin');
  });

  it('categories that agree on nothing → no enrichment rather than an empty one', () => {
    expect(deriveRulesEnrichment(['cafe', 'restaurant'])).toBeNull();
  });

  it('deterministic: same categories in any order or repeated → the same enrichment', () => {
    const reference = deriveRulesEnrichment(['nature', 'park']);
    expect(deriveRulesEnrichment(['park', 'nature', 'park'])).toEqual(reference);
    expect(deriveRulesEnrichment(['nature', 'park'])).toEqual(reference);
  });
});

describe('CATEGORY_RULES', () => {
  it('only uses documented values and DATA-1 categories', () => {
    for (const [slug, rule] of Object.entries(CATEGORY_RULES)) {
      expect(ROAM_CATEGORIES).toContain(slug);
      for (const value of rule.atmosphere) expect(DOCUMENTED_ATMOSPHERES).toContain(value);
      expect(Number.isInteger(rule.typicalDurationMin)).toBe(true);
      expect(rule.typicalDurationMin).toBeGreaterThan(0);
      expect(rule.typicalDurationMin).toBeLessThanOrEqual(240);
    }
    // The fixed values the rules write exist in the schema's enums.
    expect(Object.values(EnergyLevel)).toContain('UNKNOWN');
    expect(Object.values(Audience).length).toBeGreaterThan(0);
    expect(Object.values(Moment).length).toBeGreaterThan(0);
  });

  it('covers every ROAM category a provider can produce (Google and Geoapify alike)', () => {
    const produced = new Set([
      ...Object.values(GOOGLE_TYPE_TO_CATEGORY),
      ...Object.values(GEOAPIFY_CATEGORY_TO_CATEGORY),
    ]);
    for (const slug of produced) expect(CATEGORY_RULES).toHaveProperty(slug);
  });
});
