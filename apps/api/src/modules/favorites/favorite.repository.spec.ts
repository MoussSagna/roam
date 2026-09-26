import type { PrismaService } from '../../database/prisma.service.js';
import { FavoriteRepository } from './favorite.repository.js';

function setup() {
  const prisma = { favorite: { upsert: vi.fn(), deleteMany: vi.fn() } };
  return { prisma, repository: new FavoriteRepository(prisma as unknown as PrismaService) };
}

describe('FavoriteRepository (Prisma mocked)', () => {
  it('add is idempotent: an upsert on the unique (user, experience) key that changes nothing', async () => {
    const { prisma, repository } = setup();
    prisma.favorite.upsert.mockResolvedValue({
      id: 'f1',
      userId: 'u1',
      experienceId: 'x1',
      createdAt: new Date(0),
    });

    await repository.add('u1', 'x1');

    expect(prisma.favorite.upsert).toHaveBeenCalledWith({
      where: { userId_experienceId: { userId: 'u1', experienceId: 'x1' } },
      create: { userId: 'u1', experienceId: 'x1' },
      update: {},
    });
  });

  it('remove is idempotent: false when there was nothing to remove', async () => {
    const { prisma, repository } = setup();
    prisma.favorite.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(repository.remove('u1', 'x1')).resolves.toBe(true);
    await expect(repository.remove('u1', 'x1')).resolves.toBe(false);
  });
});
