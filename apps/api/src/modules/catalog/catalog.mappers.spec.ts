import { Prisma } from '../../generated/prisma/client.js';
import { categoryLinks, sourceCreate, toEvent, toExperience } from './catalog.mappers.js';

const dates = { createdAt: new Date(0), updatedAt: new Date(0) };

describe('catalog mappers', () => {
  it('experience: category slugs, places in order, prices as numbers, enrichment kept apart', () => {
    const experience = toExperience({
      id: 'x1',
      title: 'Café puis parc',
      description: null,
      address: null,
      city: 'Paris',
      latitude: null,
      longitude: null,
      coverImage: null,
      images: [],
      startDate: null,
      endDate: null,
      openingHours: null,
      priceLevel: 'LOW',
      priceMin: new Prisma.Decimal('12.50'),
      priceMax: null,
      currency: 'EUR',
      rating: null,
      reviewCount: null,
      popularity: null,
      isActive: true,
      categories: [{ category: { slug: 'culture' } }],
      places: [{ placeId: 'p2' }, { placeId: 'p1' }],
      enrichment: null,
      ...dates,
    });

    expect(experience).toMatchObject({
      categorySlugs: ['culture'],
      placeIds: ['p2', 'p1'],
      priceMin: 12.5,
      priceMax: null,
      enrichment: null,
    });
    expect(experience).not.toHaveProperty('categories');
    expect(experience).not.toHaveProperty('places');
  });

  it('event: category slug, or null when uncategorized', () => {
    const base = {
      id: 'e1',
      experienceId: null,
      placeId: 'p1',
      categoryId: null,
      title: 'Concert',
      description: null,
      startDate: new Date('2026-10-10T19:30:00Z'),
      endDate: null,
      timezone: null,
      images: [],
      priceMin: null,
      priceMax: null,
      currency: null,
      priceLevel: 'UNKNOWN' as const,
      bookingUrl: null,
      isActive: true,
      ...dates,
    };
    expect(toEvent({ ...base, category: null }).categorySlug).toBeNull();
    expect(toEvent({ ...base, category: { slug: 'music' } })).not.toHaveProperty('categoryId');
  });

  it('provenance: the provider is registered on first use, by its key', () => {
    const fetchedAt = new Date();
    const source = sourceCreate(
      { provider: { key: 'google_places', name: 'Google Places' }, externalId: 'ChIJ1', fetchedAt },
      'PLACE',
    );
    expect(source).toMatchObject({
      entityType: 'PLACE',
      externalId: 'ChIJ1',
      providerCategories: [],
      externalUrl: null,
      provider: {
        connectOrCreate: {
          where: { key: 'google_places' },
          create: { key: 'google_places', name: 'Google Places' },
        },
      },
    });
  });

  it('categories are linked by slug, nothing when there are none', () => {
    expect(categoryLinks(undefined)).toBeUndefined();
    expect(categoryLinks([])).toBeUndefined();
    expect(categoryLinks(['culture'])).toEqual({
      create: [{ category: { connect: { slug: 'culture' } } }],
    });
  });
});
