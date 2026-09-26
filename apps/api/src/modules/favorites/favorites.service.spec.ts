import { ApiException } from '../../common/errors/api-error.js';
import { DatabaseUnavailableError } from '../../database/persistence-errors.js';
import type { Experience } from '../catalog/catalog.types.js';
import type { ExperienceRepository } from '../catalog/experience.repository.js';
import type { User } from '../users/user.repository.js';
import type { FavoriteRepository } from './favorite.repository.js';
import { FavoritesService } from './favorites.service.js';

const me = { id: 'user-a' } as User;
const other = { id: 'user-b' } as User;
const SAVED = new Date('2026-09-26T12:00:00.000Z');
const experience = (id: string, isActive = true) => ({ id, title: id, isActive }) as Experience;
const favorite = (experienceId: string, userId = me.id) => ({
  id: `fav-${experienceId}`,
  userId,
  experienceId,
  createdAt: SAVED,
});

function setup() {
  const favorites = { add: vi.fn(), remove: vi.fn(), isFavorite: vi.fn(), listByUserId: vi.fn() };
  const experiences = {
    findManyByIds: vi.fn((ids: string[]) => Promise.resolve(ids.map((id) => experience(id)))),
  };
  const service = new FavoritesService(
    favorites as unknown as FavoriteRepository,
    experiences as unknown as ExperienceRepository,
  );
  return { service, favorites, experiences };
}

async function apiError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiException);
  return { status: (error as ApiException).getStatus(), code: (error as ApiException).code };
}

describe('FavoritesService (repositories mocked)', () => {
  describe('add', () => {
    it('saves the experience for the session user, with the experience', async () => {
      const { service, favorites } = setup();
      favorites.add.mockResolvedValue(favorite('e1'));

      const added = await service.add(me, 'e1');

      expect(favorites.add).toHaveBeenCalledWith('user-a', 'e1');
      expect(added).toMatchObject({ id: 'fav-e1', experienceId: 'e1', experience: { id: 'e1' } });
    });

    it('already a favorite: the repository’s idempotent add answers the same favorite', async () => {
      const { service, favorites } = setup();
      favorites.add.mockResolvedValue(favorite('e1'));
      const [first, second] = [await service.add(me, 'e1'), await service.add(me, 'e1')];
      expect(second.id).toBe(first.id);
    });

    it('404 NOT_FOUND for an unknown experience — nothing written', async () => {
      const { service, favorites, experiences } = setup();
      experiences.findManyByIds.mockResolvedValue([]);
      expect(await apiError(service.add(me, 'nope'))).toEqual({ status: 404, code: 'NOT_FOUND' });
      expect(favorites.add).not.toHaveBeenCalled();
    });

    it('inactive experience: 422 FAVORITE_EXPERIENCE_INACTIVE, unless it already is my favorite', async () => {
      const { service, favorites, experiences } = setup();
      experiences.findManyByIds.mockResolvedValue([experience('old', false)]);

      favorites.isFavorite.mockResolvedValueOnce(false);
      expect(await apiError(service.add(me, 'old'))).toEqual({
        status: 422,
        code: 'FAVORITE_EXPERIENCE_INACTIVE',
      });
      expect(favorites.add).not.toHaveBeenCalled();

      favorites.isFavorite.mockResolvedValueOnce(true);
      favorites.add.mockResolvedValue(favorite('old'));
      expect((await service.add(me, 'old')).experienceId).toBe('old');
      expect(favorites.isFavorite).toHaveBeenCalledWith('user-a', 'old');
    });

    it('repository errors pass through (the global filter answers 503)', async () => {
      const { service, favorites } = setup();
      favorites.add.mockRejectedValue(new DatabaseUnavailableError());
      await expect(service.add(me, 'e1')).rejects.toBeInstanceOf(DatabaseUnavailableError);
    });
  });

  describe('list', () => {
    it('the session user’s page, experiences fetched once for the whole page, in the page’s order', async () => {
      const { service, favorites, experiences } = setup();
      favorites.listByUserId.mockResolvedValue({
        items: [favorite('e2'), favorite('e1')],
        nextCursor: 'fav-e1',
      });

      const page = await service.list(me, { limit: 2 });

      expect(favorites.listByUserId).toHaveBeenCalledWith('user-a', { limit: 2 });
      expect(experiences.findManyByIds).toHaveBeenCalledTimes(1);
      expect(page.items.map((item) => item.experience.id)).toEqual(['e2', 'e1']);
      expect(page.nextCursor).toBe('fav-e1');
    });

    it('no favorite: an empty page, no experience query needed beyond an empty one', async () => {
      const { service, favorites } = setup();
      favorites.listByUserId.mockResolvedValue({ items: [], nextCursor: null });
      expect(await service.list(other, {})).toEqual({ items: [], nextCursor: null });
      expect(favorites.listByUserId).toHaveBeenCalledWith('user-b', {});
    });
  });

  describe('remove', () => {
    it('removes the session user’s favorite; nothing to remove is not an error', async () => {
      const { service, favorites } = setup();
      favorites.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      await service.remove(me, 'e1');
      await service.remove(me, 'e1');
      expect(favorites.remove.mock.calls).toEqual([
        ['user-a', 'e1'],
        ['user-a', 'e1'],
      ]);
    });

    it('another user only ever removes their own (the owner is never taken from the request)', async () => {
      const { service, favorites } = setup();
      favorites.remove.mockResolvedValue(false);
      await service.remove(other, 'e1');
      expect(favorites.remove).toHaveBeenCalledWith('user-b', 'e1');
    });
  });
});
