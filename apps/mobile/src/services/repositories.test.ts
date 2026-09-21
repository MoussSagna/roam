import { repositories } from './index';

describe('repositories (mock implementation)', () => {
  it('lists categories', async () => {
    const categories = await repositories.categories.list();
    expect(categories.length).toBeGreaterThan(0);
  });

  it('resolves an experience and its places through the repository contracts', async () => {
    const experience = await repositories.experiences.getById('exp-slow-afternoon');
    expect(experience).not.toBeNull();

    const places = await Promise.all(
      experience!.placeIds.map((id) => repositories.places.getById(id)),
    );
    expect(places.every((place) => place !== null)).toBe(true);
  });

  it('returns null for unknown ids', async () => {
    expect(await repositories.experiences.getById('nope')).toBeNull();
    expect(await repositories.places.getById('nope')).toBeNull();
  });

  it('returns copies so callers cannot mutate the fixtures', async () => {
    const [first] = await repositories.experiences.list();
    first.title = 'mutated';
    const [again] = await repositories.experiences.list();
    expect(again.title).not.toBe('mutated');
  });
});
