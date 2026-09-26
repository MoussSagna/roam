import type { User } from '@/types';

import type { UserDto } from '../dto';

/**
 * API user (`GET /auth/me`, the public profile of `apps/api/apidocs/USER_PROFILE_AND_PREFERENCES.md`) → the
 * app's `User`. Same fields; the API's `null` ("not filled in") becomes the app's absent optional field.
 * `stats` is not served by the API (computed later from journeys and favorites): left unset.
 */
export function mapUserDto(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    displayName: dto.displayName,
    avatarUrl: dto.avatarUrl ?? undefined,
    age: dto.age ?? undefined,
    city: dto.city ?? undefined,
    bio: dto.bio ?? undefined,
  };
}
