import { ApiException } from '../../common/errors/api-error.js';
import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { ExperienceRepository } from '../catalog/experience.repository.js';
import { ExperiencesService } from './experiences.service.js';

function setup() {
  const experiences = { listActive: vi.fn(), findById: vi.fn() };
  return {
    experiences,
    service: new ExperiencesService(experiences as unknown as ExperienceRepository),
  };
}

describe('ExperiencesService (repository mocked)', () => {
  it('list: query → repository filter (budget as its euro ceiling) and page', async () => {
    const { service, experiences } = setup();
    const page = { items: [], nextCursor: null };
    experiences.listActive.mockResolvedValue(page);

    expect(
      await service.list({
        category: 'culture',
        city: 'Paris',
        budget: 'under10',
        q: 'musée',
        limit: 5,
      }),
    ).toBe(page);
    expect(experiences.listActive).toHaveBeenCalledWith(
      { categorySlug: 'culture', city: 'Paris', maxPrice: 10, text: 'musée' },
      { limit: 5, cursor: undefined },
    );
  });

  it('list: "50plus" has no ceiling; no filter at all is the whole active catalog', async () => {
    const { service, experiences } = setup();
    experiences.listActive.mockResolvedValue({ items: [], nextCursor: null });

    await service.list({ budget: '50plus' });
    await service.list({});

    expect(experiences.listActive.mock.calls.map(([filter]) => filter as object)).toEqual([
      { categorySlug: undefined, city: undefined, maxPrice: undefined, text: undefined },
      { categorySlug: undefined, city: undefined, maxPrice: undefined, text: undefined },
    ]);
  });

  it('get: the experience, or 404 NOT_FOUND', async () => {
    const { service, experiences } = setup();
    const detail = { id: 'x1', places: [] };
    experiences.findById.mockResolvedValueOnce(detail).mockResolvedValueOnce(null);

    expect(await service.get('x1')).toBe(detail);
    const error: unknown = await service.get('x2').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
  });

  it('repository errors pass through', async () => {
    const { service, experiences } = setup();
    experiences.listActive.mockRejectedValue(new DatabaseUnavailableError());
    await expect(service.list({})).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
