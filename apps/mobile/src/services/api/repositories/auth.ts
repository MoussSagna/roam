import type { AuthRepository, UserRepository } from '../../repositories/types';
import { mapUserDto } from '../adapters/user';
import type { ApiClient } from '../apiClient';
import { isApiError } from '../apiError';
import type { AuthResultDto, UserDto } from '../dto';
import type { SessionStorage } from '../sessionStorage';

/** Listeners of "the server refused the session", fed by the API client's 401 hook. */
export type SessionExpiryEvents = {
  emit(): void;
  subscribe(listener: () => void): () => void;
};

export function createSessionExpiryEvents(): SessionExpiryEvents {
  const listeners = new Set<() => void>();
  return {
    emit: () => {
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * `AuthRepository` on the API (`apps/api/apidocs/AUTHENTICATION.md` → "Mobile contract"): email + password,
 * an opaque session token kept in the secure store, `GET /auth/me` to check it at startup, an idempotent
 * logout. The token never leaves this file and the client; the password is sent once and never kept.
 */
export function createApiAuthRepository(
  client: ApiClient,
  sessionStorage: SessionStorage,
  sessionExpiry: SessionExpiryEvents,
): AuthRepository {
  async function openSession(result: AuthResultDto): Promise<void> {
    await sessionStorage.setToken(result.session.token);
  }

  return {
    async restoreSession() {
      if (!(await sessionStorage.getToken())) return false;
      try {
        await client.get<UserDto>('/auth/me');
        return true;
      } catch (error) {
        // 401: the client already forgot the token. Anything else (offline, timeout, 5xx, 429) says nothing
        // about the session itself: keep it, the screens will show their own error states.
        if (isApiError(error) && error.isUnauthorized) return false;
        return true;
      }
    },

    async login({ email, password }) {
      const result = await client.post<AuthResultDto>(
        '/auth/login',
        { email: email.trim(), password },
        { authenticated: false },
      );
      await openSession(result);
    },

    async register({ displayName, email, password }) {
      const result = await client.post<AuthResultDto>(
        '/auth/register',
        { displayName: displayName.trim(), email: email.trim(), password },
        { authenticated: false },
      );
      await openSession(result);
    },

    async logout() {
      try {
        // Public and idempotent server-side: 204 even for an expired or unknown token.
        await client.post<void>('/auth/logout');
      } catch {
        // Offline or server down: the device forgets the session anyway (it expires server-side).
      } finally {
        await sessionStorage.clearToken();
      }
    },

    onSessionExpired: (listener) => sessionExpiry.subscribe(listener),
  };
}

/** `UserRepository` on the API: the profile is `GET /auth/me` (USER_PROFILE_AND_PREFERENCES.md). */
export function createApiUserRepository(client: ApiClient): UserRepository {
  return {
    getCurrentUser: async () => mapUserDto(await client.get<UserDto>('/auth/me')),
  };
}
