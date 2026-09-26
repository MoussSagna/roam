import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiException, ErrorCode } from '../../common/errors/api-error.js';
import type { Page, PageRequest } from '../../database/pagination.js';
import type { Experience } from '../catalog/catalog.types.js';
import { ExperienceRepository } from '../catalog/experience.repository.js';
import type { User } from '../users/user.repository.js';
import { type Favorite, FavoriteRepository } from './favorite.repository.js';

/** The domain error code of the favorites API (FAVORITES_API.md → "Errors"). */
export const FavoriteErrorCode = {
  ExperienceInactive: 'FAVORITE_EXPERIENCE_INACTIVE',
} as const;

/** A favorite with the canonical experience it points at. */
export type FavoriteDetail = Favorite & { experience: Experience };

/**
 * My favorite experiences (mobile D-57: favorites are experiences): a set, owned by the session user. `add` and
 * `remove` are idempotent (the repository's upsert / delete on the unique `(userId, experienceId)` key). Favorites
 * change neither the experience, nor journeys, nor recommendations.
 */
@Injectable()
export class FavoritesService {
  constructor(
    private readonly favorites: FavoriteRepository,
    private readonly experiences: ExperienceRepository,
  ) {}

  /** Most recently saved first; the experiences of the page fetched in one go (no query per favorite). */
  async list(me: User, page: PageRequest): Promise<Page<FavoriteDetail>> {
    const result = await this.favorites.listByUserId(me.id, page);
    return { items: await this.withExperiences(result.items), nextCursor: result.nextCursor };
  }

  /**
   * Saves an experience. Unknown → 404. Inactive ("no longer offered" — EXPERIENCE_CATALOG_API.md) → 422, unless it is
   * already one of my favorites: favorites keep an experience after it is deactivated, and saving it again stays
   * idempotent.
   */
  async add(me: User, experienceId: string): Promise<FavoriteDetail> {
    const [experience] = await this.experiences.findManyByIds([experienceId]);
    if (!experience) {
      throw new ApiException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, 'Experience not found.');
    }
    if (!experience.isActive && !(await this.favorites.isFavorite(me.id, experienceId))) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        FavoriteErrorCode.ExperienceInactive,
        'This experience is no longer offered.',
      );
    }
    return { ...(await this.favorites.add(me.id, experienceId)), experience };
  }

  /** Removes one of my favorites; nothing to remove is not an error (idempotent). Never touches another user's. */
  async remove(me: User, experienceId: string): Promise<void> {
    await this.favorites.remove(me.id, experienceId);
  }

  private async withExperiences(favorites: Favorite[]): Promise<FavoriteDetail[]> {
    const byId = new Map(
      (await this.experiences.findManyByIds(favorites.map((f) => f.experienceId))).map((e) => [
        e.id,
        e,
      ]),
    );
    return favorites.map((favorite) => {
      const experience = byId.get(favorite.experienceId);
      // A favorite's experience cannot disappear (foreign key, cascade delete): missing means a broken database.
      if (!experience) {
        throw new Error(`Experience ${favorite.experienceId} of a favorite is missing`);
      }
      return { ...favorite, experience };
    });
  }
}
