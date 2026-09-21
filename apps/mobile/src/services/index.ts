import { createMockRepositories } from './mock';
import type { Repositories } from './repositories/types';

export type * from './repositories/types';

/**
 * The single place that decides where data comes from.
 * Switching to the API later means building `createApiRepositories()` and changing this line.
 */
export const repositories: Repositories = createMockRepositories();
