import i18n from '@/i18n';

import { categories } from '../mock/data';
import { createMockRepositories } from '../mock';
import type { Repositories } from '../repositories/types';

import type { ExperienceMappingContext } from './adapters/experience';
import { createApiClient } from './apiClient';
import {
  createApiAuthRepository,
  createApiUserRepository,
  createSessionExpiryEvents,
} from './repositories/auth';
import { createApiExperienceRepository } from './repositories/experiences';
import { createApiFavoriteRepository } from './repositories/favorites';
import { createApiSearchRepository } from './repositories/search';
import { createSecureSessionStorage, type SessionStorage } from './sessionStorage';

export { API_ERROR_CODES, ApiError, errorMessageKey, isApiError } from './apiError';

type ApiRepositoriesOptions = {
  /** The API origin, from `config/dataSource.ts`. */
  apiUrl: string;
  sessionStorage?: SessionStorage;
  fetchImpl?: typeof fetch;
};

/**
 * API mode (`EXPO_PUBLIC_DATA_SOURCE=api`): the same `Repositories` contract as the mock, so no screen
 * knows where its data comes from. Each domain is listed explicitly, with where it comes from — a domain
 * never switches source at run time, and an API failure is an error, never a quiet fallback to the mock.
 */
export function createApiRepositories({
  apiUrl,
  sessionStorage = createSecureSessionStorage(),
  fetchImpl,
}: ApiRepositoriesOptions): Repositories {
  const sessionExpiry = createSessionExpiryEvents();
  const client = createApiClient({
    baseUrl: apiUrl,
    sessionStorage,
    onUnauthorized: sessionExpiry.emit,
    fetchImpl,
  });
  const mappingContext: ExperienceMappingContext = {
    // The category vocabulary has no endpoint: the app's own list, whose slugs are the catalog's (DATA-1
    // migrated them one to one).
    categories,
    t: (key, options) => i18n.t(key as never, options as never) as unknown as string,
  };
  const local = createMockRepositories();

  return {
    // ROAM API
    auth: createApiAuthRepository(client, sessionStorage, sessionExpiry),
    users: createApiUserRepository(client),
    experiences: createApiExperienceRepository(client, mappingContext),
    search: createApiSearchRepository(client, mappingContext),
    favorites: createApiFavoriteRepository(client),

    // Still local in API mode (DATA-8 scope, `mobiledocs/MOBILE_API_INTEGRATION.md` → "Domains still local"):
    // no endpoint (categories vocabulary, editorial collections, places by id) or not migrated yet (journeys,
    // journey feedback — API-08/API-09 are ready, the mobile migration is the next step).
    categories: local.categories,
    collections: local.collections,
    places: local.places,
    journeys: local.journeys,
    journeyFeedback: local.journeyFeedback,
  };
}
