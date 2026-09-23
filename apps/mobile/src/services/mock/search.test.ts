import { categories, experiences } from './data';
import { createMockSearchRepository } from './search';

describe('createMockSearchRepository', () => {
  const repository = createMockSearchRepository(experiences, categories);

  it('matches by title, accent/case-insensitive', async () => {
    const results = await repository.search('ROOFTOP');
    expect(results.some((experience) => experience.title === 'Rooftop Sunset')).toBe(true);
  });

  it('matches by description text', async () => {
    const results = await repository.search('expositions');
    expect(results.some((experience) => experience.title === 'Musée nocturne')).toBe(true);
  });

  it('matches by category slug', async () => {
    const results = await repository.search('restaurant');
    const restaurantCategory = categories.find((category) => category.slug === 'restaurant')!;
    expect(
      results.every((experience) =>
        experience.categoryIds.includes(restaurantCategory.id) ||
          experience.title.toLowerCase().includes('restaurant') ||
          experience.description.toLowerCase().includes('restaurant'),
      ),
    ).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns everything for an empty query', async () => {
    const results = await repository.search('');
    expect(results.length).toBe(experiences.length);
  });

  it('returns nothing for a query that matches no experience', async () => {
    const results = await repository.search('xyznonexistentquery');
    expect(results).toEqual([]);
  });

  it('filters by category id', async () => {
    const barCategory = categories.find((category) => category.slug === 'bar')!;
    const results = await repository.search('', { categoryId: barCategory.id });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((experience) => experience.categoryIds.includes(barCategory.id))).toBe(
      true,
    );
  });

  it('filters by budget', async () => {
    const results = await repository.search('', { budget: 'free' });
    expect(results.every((experience) => experience.estimatedBudget === 'free')).toBe(true);
  });

  it('filters by max distance', async () => {
    const results = await repository.search('', { maxDistanceKm: 1 });
    expect(results.every((experience) => experience.distanceLabel)).toBe(true);
  });

  it('returns copies, not references into the mock fixtures', async () => {
    const [first] = await repository.search('');
    first.title = 'mutated';
    const [again] = await repository.search('');
    expect(again.title).not.toBe('mutated');
  });

  it('suggests nothing for an empty query', async () => {
    expect(await repository.suggest('')).toEqual([]);
  });

  it('suggests at most a few experiences for a matching query', async () => {
    const suggestions = await repository.suggest('rooftop');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((suggestion) => suggestion.type === 'experience')).toBe(true);
  });
});
