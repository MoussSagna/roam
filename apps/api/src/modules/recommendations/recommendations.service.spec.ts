import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { Enrichment, Experience } from '../catalog/catalog.types.js';
import type { ExperienceRepository } from '../catalog/experience.repository.js';
import type { User, UserPreference } from '../users/user.repository.js';
import type { UsersService } from '../users/users.service.js';
import {
  type AppliedContext,
  applyPreferences,
  byRank,
  CANDIDATE_LIMIT,
  passes,
  reasonsFor,
  RecommendationsService,
  relaxations,
} from './recommendations.service.js';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const me = { id: 'user-a' } as User;

const enrichment = (fields: Partial<Enrichment>): Enrichment => ({
  atmosphere: [],
  energyLevel: 'UNKNOWN',
  suitableFor: [],
  bestMoments: [],
  tags: [],
  estimatedDurationMin: null,
  durationIsDerived: false,
  source: 'ROAM_RULES',
  confidence: null,
  ...fields,
});

/** An experience `offsetKm` north of the center of Paris (1° of latitude ≈ 111.2 km). */
function experience(
  id: string,
  fields: Partial<Experience> & { offsetKm?: number } = {},
): Experience {
  const { offsetKm, ...rest } = fields;
  return {
    id,
    title: id,
    description: null,
    address: null,
    city: 'Paris',
    latitude: offsetKm === undefined ? null : PARIS.latitude + offsetKm / 111.195,
    longitude: offsetKm === undefined ? null : PARIS.longitude,
    coverImage: null,
    images: [],
    startDate: null,
    endDate: null,
    openingHours: null,
    priceLevel: 'UNKNOWN',
    priceMin: null,
    priceMax: null,
    currency: null,
    rating: null,
    reviewCount: null,
    popularity: null,
    isActive: true,
    categorySlugs: [],
    placeIds: [],
    enrichment: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...rest,
  };
}

const context = (fields: Partial<AppliedContext> = {}): AppliedContext => ({
  location: null,
  maxDistanceKm: null,
  budget: null,
  availableMinutes: null,
  company: null,
  category: null,
  fromPreferences: [],
  ...fields,
});

function setup(preference: UserPreference | null = null) {
  const experiences = { findCandidates: vi.fn() };
  const users = { getPreferences: vi.fn().mockResolvedValue(preference) };
  const service = new RecommendationsService(
    experiences as unknown as ExperienceRepository,
    users as unknown as UsersService,
  );
  return { service, experiences, users };
}

describe('recommendation rules', () => {
  describe('applyPreferences', () => {
    const preference: UserPreference = {
      interests: [],
      activities: [],
      usualBudget: 'UNDER_10',
      maxDistanceKm: 3,
      usualCompany: 'COUPLE',
      updatedAt: new Date(0),
    };

    it('the request wins; the preferences fill what it leaves out, and say so', () => {
      expect(applyPreferences({ budget: '50plus' }, preference)).toMatchObject({
        budget: '50plus',
        company: 'couple',
        maxDistanceKm: null, // no location: a distance cannot apply
        fromPreferences: ['company'],
      });
      expect(applyPreferences({ location: PARIS }, preference)).toMatchObject({
        budget: 'under10',
        maxDistanceKm: 3,
        company: 'couple',
        fromPreferences: ['budget', 'maxDistanceKm', 'company'],
      });
    });

    it('no preferences, empty request: nothing constrained', () => {
      expect(applyPreferences({}, null)).toEqual(context());
    });
  });

  describe('hard filters: only a known fact that breaks a constraint excludes', () => {
    const none = new Set<never>();

    it('distance: beyond the radius out; unknown position kept', () => {
      expect(passes(experience('x'), 9000, context(), none, 5000)).toBe(false);
      expect(passes(experience('x'), 4000, context(), none, 5000)).toBe(true);
      expect(passes(experience('x'), null, context(), none, 5000)).toBe(true);
    });

    it('duration: longer than the time available out; unknown duration kept', () => {
      const long = experience('x', { enrichment: enrichment({ estimatedDurationMin: 180 }) });
      expect(passes(long, null, context({ availableMinutes: 120 }), none, null)).toBe(false);
      expect(passes(long, null, context({ availableMinutes: 240 }), none, null)).toBe(true);
      expect(passes(experience('y'), null, context({ availableMinutes: 30 }), none, null)).toBe(
        true,
      );
      expect(
        passes(long, null, context({ availableMinutes: 120 }), new Set(['duration']), null),
      ).toBe(true);
    });

    it('company: a known audience that excludes it out; unknown or UNKNOWN kept', () => {
      const couplesOnly = experience('x', { enrichment: enrichment({ suitableFor: ['COUPLE'] }) });
      const unknown = experience('y', { enrichment: enrichment({ suitableFor: ['UNKNOWN'] }) });
      expect(passes(couplesOnly, null, context({ company: 'family' }), none, null)).toBe(false);
      expect(passes(couplesOnly, null, context({ company: 'couple' }), none, null)).toBe(true);
      expect(passes(unknown, null, context({ company: 'family' }), none, null)).toBe(true);
      expect(passes(experience('z'), null, context({ company: 'family' }), none, null)).toBe(true);
    });
  });

  it('reasons: only constraints actually matched with known facts', () => {
    const matching = experience('x', {
      priceMin: 8,
      enrichment: enrichment({ estimatedDurationMin: 60, suitableFor: ['FRIENDS'] }),
    });
    const ctx = context({ budget: 'under10', availableMinutes: 90, company: 'friends' });

    expect(reasonsFor(matching, 1500, ctx)).toEqual(['nearby', 'budget', 'duration', 'company']);
    // Unknown price, duration, audience, far away: no reason claimed.
    expect(reasonsFor(experience('y'), 3000, ctx)).toEqual([]);
    // No budget asked: "budget" is never claimed.
    expect(reasonsFor(matching, null, context())).toEqual([]);
  });

  it('ranking: nearer first (≤2 km, ≤5 km), then rating, then distance, then id — stable', () => {
    const item = (id: string, distanceM: number | null, rating: number | null = null) => ({
      experience: experience(id, { rating }),
      distanceM,
      reasons: [],
    });
    const items = [
      item('e', null, 5),
      item('d', 7000, 4),
      item('c', 4000),
      item('b', 1500),
      item('a', 1500),
      item('f', 1000, 4.8),
    ];

    expect([...items].sort(byRank).map((i) => i.experience.id)).toEqual([
      'f',
      'a',
      'b',
      'c',
      'e',
      'd',
    ]);
    expect(
      [...items]
        .reverse()
        .sort(byRank)
        .map((i) => i.experience.id),
    ).toEqual(['f', 'a', 'b', 'c', 'e', 'd']);
  });
});

describe('RecommendationsService (repositories mocked)', () => {
  it('queries candidates with the budget ceiling, the category and a box around the user', async () => {
    const { service, experiences, users } = setup();
    experiences.findCandidates.mockResolvedValue([]);

    await service.recommend(me, {
      location: PARIS,
      maxDistanceKm: 5,
      budget: '10to25',
      category: 'culture',
    });

    expect(users.getPreferences).toHaveBeenCalledWith(me);
    const [filter, max] = experiences.findCandidates.mock.calls[0] as [
      {
        maxPrice: number;
        categorySlug: string;
        area: { minLatitude: number; maxLatitude: number };
      },
      number,
    ];
    expect(filter.maxPrice).toBe(25);
    expect(filter.categorySlug).toBe('culture');
    expect(filter.area.minLatitude).toBeLessThan(PARIS.latitude);
    expect(filter.area.maxLatitude).toBeGreaterThan(PARIS.latitude);
    expect(max).toBe(CANDIDATE_LIMIT);
  });

  it('filters, ranks, explains and cuts to the limit; no relaxation when something fits', async () => {
    const { service, experiences } = setup();
    experiences.findCandidates.mockResolvedValue([
      experience('far', { offsetKm: 8 }),
      experience('near', { offsetKm: 1, rating: 4 }),
      experience('mid', { offsetKm: 3 }),
      experience('nowhere'),
    ]);

    const result = await service.recommend(me, { location: PARIS, maxDistanceKm: 5, limit: 2 });

    expect(result.items.map((i) => i.experience.id)).toEqual(['near', 'mid']);
    expect(result.items[0].reasons).toEqual(['nearby']);
    expect(result.items[0].distanceM).toBeCloseTo(1000, -1);
    expect(result.relaxed).toEqual([]);
    expect(experiences.findCandidates).toHaveBeenCalledOnce();
  });

  it('nothing fits: one constraint dropped at a time, in order (budget, distance, …), and said', async () => {
    const { service, experiences } = setup();
    experiences.findCandidates
      .mockResolvedValueOnce([]) // everything applied
      .mockResolvedValueOnce([experience('far', { offsetKm: 8 })]) // budget dropped: still too far
      .mockResolvedValueOnce([experience('far', { offsetKm: 8 })]); // distance dropped (budget kept)

    const result = await service.recommend(me, {
      location: PARIS,
      maxDistanceKm: 2,
      budget: 'free',
    });

    expect(result.relaxed).toEqual(['distance']);
    expect(result.items.map((i) => i.experience.id)).toEqual(['far']);
    const filters = experiences.findCandidates.mock.calls.map(([filter]) => filter as object);
    expect(filters[1]).toMatchObject({ maxPrice: undefined });
    expect(filters[2]).toMatchObject({ maxPrice: 0, area: undefined });
  });

  it('relaxations: none, each active constraint alone, then all together', () => {
    expect(relaxations(context())).toEqual([[]]);
    expect(relaxations(context({ availableMinutes: 60 }))).toEqual([[], ['duration']]);
    expect(
      relaxations(
        context({ budget: 'free', location: PARIS, maxDistanceKm: 2, company: 'couple' }),
      ),
    ).toEqual([[], ['budget'], ['distance'], ['company'], ['budget', 'distance', 'company']]);
    // "50plus" has no ceiling: nothing to relax.
    expect(relaxations(context({ budget: '50plus' }))).toEqual([[]]);
  });

  it('an unused constraint is not "relaxed" (no duplicate query); an empty catalog answers empty', async () => {
    const { service, experiences } = setup();
    experiences.findCandidates.mockResolvedValue([]);

    const result = await service.recommend(me, { availableMinutes: 60 });

    expect(result).toMatchObject({ items: [], relaxed: [] });
    // Only "duration" was active: the full query, then once without it.
    expect(experiences.findCandidates).toHaveBeenCalledTimes(2);
  });

  it('preferences complete an incomplete context; missing optional data never breaks it', async () => {
    const { service, experiences } = setup({
      interests: [],
      activities: [],
      usualBudget: 'UNDER_10',
      maxDistanceKm: null,
      usualCompany: null,
      updatedAt: new Date(0),
    });
    experiences.findCandidates.mockResolvedValue([experience('bare')]);

    const result = await service.recommend(me, {});

    expect(result.context).toMatchObject({ budget: 'under10', fromPreferences: ['budget'] });
    expect(result.items).toEqual([
      { experience: experience('bare'), distanceM: null, reasons: [] },
    ]);
  });

  it('a repository error passes through (the global filter answers 503)', async () => {
    const { service, experiences } = setup();
    experiences.findCandidates.mockRejectedValue(new DatabaseUnavailableError());
    await expect(service.recommend(me, {})).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
