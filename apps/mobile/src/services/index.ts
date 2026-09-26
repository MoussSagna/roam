import { type DataSourceConfig, readDataSourceConfig } from '@/config/dataSource';

import { createApiRepositories } from './api';
import { createMockRepositories } from './mock';
import type { Repositories } from './repositories/types';

export type * from './repositories/types';
export { API_ERROR_CODES, ApiError, errorMessageKey, isApiError } from './api';

/**
 * The single place that decides where data comes from (DATA-8): `mock` or `api`, from
 * `EXPO_PUBLIC_DATA_SOURCE` (`config/dataSource.ts`). Screens and hooks only ever see `Repositories`.
 */
export function createRepositories(config: DataSourceConfig): Repositories {
  return config.source === 'api'
    ? createApiRepositories({ apiUrl: config.apiUrl })
    : createMockRepositories();
}

export const repositories: Repositories = createRepositories(readDataSourceConfig());
