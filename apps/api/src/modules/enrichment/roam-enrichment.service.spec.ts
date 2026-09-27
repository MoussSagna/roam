import { Logger } from '@nestjs/common';

import {
  DatabaseUnavailableError,
  RecordNotFoundError,
  UniqueConstraintError,
} from '../../database/persistence-errors.js';
import type { Enrichment, Place } from '../catalog/catalog.types.js';
import type { PlaceRepository } from '../catalog/place.repository.js';
import type { RoamEnrichmentRepository } from '../catalog/roam-enrichment.repository.js';
import { deriveRulesEnrichment } from './roam-enrichment.rules.js';
import { RoamEnrichmentService } from './roam-enrichment.service.js';

const place = (overrides: Partial<Place> = {}): Place => ({
  id: 'p1',
  name: 'Parc Test',
  description: null,
  address: null,
  city: 'Paris',
  latitude: 48.86,
  longitude: 2.35,
  photos: [],
  openingHours: null,
  priceLevel: 'UNKNOWN',
  rating: null,
  reviewCount: null,
  attributes: null,
  website: null,
  rnbId: null,
  isActive: true,
  categorySlugs: ['park'],
  enrichment: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const PARK_RULES = deriveRulesEnrichment(['park'])!;

const CURATED: Enrichment = {
  atmosphere: ['COZY'],
  energyLevel: 'LOW',
  suitableFor: ['COUPLE'],
  bestMoments: ['MORNING'],
  tags: ['brunch'],
  estimatedDurationMin: 75,
  durationIsDerived: false,
  source: 'CURATED',
  confidence: { tags: { basis: 'mobile_mock_migration' } },
};

function setup(found: Place | null = place()) {
  const places = { findById: vi.fn().mockResolvedValue(found) };
  const enrichments = {
    findByPlaceId: vi.fn(),
    createForPlace: vi.fn((_id: string, value: Enrichment) => Promise.resolve(value)),
    replaceRulesEnrichmentOfPlace: vi.fn().mockResolvedValue(true),
  };
  const service = new RoamEnrichmentService(
    places as unknown as PlaceRepository,
    enrichments as unknown as RoamEnrichmentRepository,
  );
  return { places, enrichments, service };
}

describe('RoamEnrichmentService (repositories mocked)', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('first enrichment: creates the rules enrichment and reports the quality', async () => {
    const { service, enrichments } = setup();

    const result = await service.enrichPlace('p1');

    expect(enrichments.createForPlace).toHaveBeenCalledWith('p1', PARK_RULES);
    expect(result).toMatchObject({
      placeId: 'p1',
      outcome: 'created',
      enrichment: PARK_RULES,
      quality: {
        recommendationReady: true,
        enriched: true,
        missingFacts: ['address', 'priceLevel', 'rating', 'reviewCount'],
      },
    });
  });

  it('an up-to-date rules enrichment is not rewritten (idempotent)', async () => {
    // As read back from jsonb: same content, keys in another order.
    const stored = {
      ...PARK_RULES,
      confidence: Object.fromEntries(
        Object.entries(PARK_RULES.confidence as Record<string, unknown>).reverse(),
      ),
    } as Enrichment;
    const { service, enrichments } = setup(place({ enrichment: stored }));

    await expect(service.enrichPlace('p1')).resolves.toMatchObject({ outcome: 'unchanged' });
    expect(enrichments.createForPlace).not.toHaveBeenCalled();
    expect(enrichments.replaceRulesEnrichmentOfPlace).not.toHaveBeenCalled();
  });

  it('an outdated rules enrichment (older rules, other categories) is updated in place', async () => {
    const outdated: Enrichment = { ...PARK_RULES, estimatedDurationMin: 30 };
    const { service, enrichments } = setup(place({ enrichment: outdated }));

    await expect(service.enrichPlace('p1')).resolves.toMatchObject({
      outcome: 'updated',
      enrichment: PARK_RULES,
    });
    expect(enrichments.replaceRulesEnrichmentOfPlace).toHaveBeenCalledWith('p1', PARK_RULES);
  });

  it.each(['CURATED', 'USER_FEEDBACK'] as const)(
    'a %s enrichment is never overwritten',
    async (source) => {
      const { service, enrichments } = setup(place({ enrichment: { ...CURATED, source } }));

      const result = await service.enrichPlace('p1');

      expect(result).toMatchObject({ outcome: 'kept_curated', enrichment: { ...CURATED, source } });
      expect(enrichments.createForPlace).not.toHaveBeenCalled();
      expect(enrichments.replaceRulesEnrichmentOfPlace).not.toHaveBeenCalled();
    },
  );

  it('curated between the read and the write: the conditional update writes nothing, curated is kept', async () => {
    const { service, enrichments } = setup(
      place({ enrichment: { ...PARK_RULES, estimatedDurationMin: 30 } }),
    );
    enrichments.replaceRulesEnrichmentOfPlace.mockResolvedValue(false);
    enrichments.findByPlaceId.mockResolvedValue(CURATED);

    await expect(service.enrichPlace('p1')).resolves.toMatchObject({
      outcome: 'kept_curated',
      enrichment: CURATED,
    });
  });

  it('concurrent first enrichment: the loser finds the winner’s row and reports it unchanged', async () => {
    const { service, enrichments } = setup();
    enrichments.createForPlace.mockRejectedValue(new UniqueConstraintError());
    enrichments.findByPlaceId.mockResolvedValue(PARK_RULES);

    await expect(service.enrichPlace('p1')).resolves.toMatchObject({ outcome: 'unchanged' });
    expect(enrichments.createForPlace).toHaveBeenCalledTimes(1);
  });

  it('no rule for the categories: nothing written, the place is reported as it is', async () => {
    const { service, enrichments } = setup(place({ categorySlugs: ['experience'] }));

    await expect(service.enrichPlace('p1')).resolves.toMatchObject({
      outcome: 'no_rule',
      enrichment: null,
      quality: { enriched: false, recommendationReady: true },
    });
    expect(enrichments.createForPlace).not.toHaveBeenCalled();
  });

  it('a place without category: no enrichment and not recommendation-ready', async () => {
    const { service } = setup(place({ categorySlugs: [] }));
    await expect(service.enrichPlace('p1')).resolves.toMatchObject({
      outcome: 'no_rule',
      quality: { recommendationReady: false, issues: ['NO_CATEGORY'] },
    });
  });

  it('unknown place: RecordNotFoundError, nothing written', async () => {
    const { service, enrichments } = setup(null);
    await expect(service.enrichPlace('missing')).rejects.toBeInstanceOf(RecordNotFoundError);
    expect(enrichments.createForPlace).not.toHaveBeenCalled();
  });

  it('persistence errors pass through', async () => {
    const { service, enrichments } = setup();
    enrichments.createForPlace.mockRejectedValue(new DatabaseUnavailableError());
    await expect(service.enrichPlace('p1')).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });

  it('enrichPlaces: counts every outcome and the recommendation-ready places', async () => {
    const { service, places } = setup();
    places.findById
      .mockResolvedValueOnce(place({ id: 'a' }))
      .mockResolvedValueOnce(place({ id: 'b', enrichment: CURATED }))
      .mockResolvedValueOnce(place({ id: 'c', categorySlugs: [] }));

    const report = await service.enrichPlaces(['a', 'b', 'c']);

    expect(report).toMatchObject({
      created: 1,
      updated: 0,
      unchanged: 0,
      kept_curated: 1,
      no_rule: 1,
      recommendationReady: 2,
    });
    expect(report.results.map((result) => result.placeId)).toEqual(['a', 'b', 'c']);
  });
});
