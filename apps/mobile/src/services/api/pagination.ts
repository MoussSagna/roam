import type { ApiClient, RequestOptions } from './apiClient';
import { ApiError, CLIENT_ERROR_CODES } from './apiError';
import type { PageDto } from './dto';

/** The API's largest page (`limit` 1–100). */
export const MAX_PAGE_SIZE = 100;

function isPage(value: unknown): value is PageDto<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PageDto<unknown>).items) &&
    ((value as PageDto<unknown>).nextCursor === null ||
      typeof (value as PageDto<unknown>).nextCursor === 'string')
  );
}

function malformedPage(): ApiError {
  return new ApiError({
    status: 200,
    code: CLIENT_ERROR_CODES.invalidResponse,
    message: 'The server answered with an unexpected page.',
  });
}

/** One page of a keyset-paginated list (`{ items, nextCursor }`), shape-checked. */
export async function fetchPage<T>(
  client: ApiClient,
  path: string,
  query: RequestOptions['query'],
): Promise<PageDto<T>> {
  const page = await client.get<unknown>(path, { query });
  if (!isPage(page)) throw malformedPage();
  return page as PageDto<T>;
}

/**
 * Every item of a keyset-paginated list, following `nextCursor` until `null` — for the repository
 * contracts that return whole lists (`ExperienceRepository.list()`). Sequential by nature (each cursor
 * comes from the previous page); a cursor seen twice is a server bug and stops instead of looping.
 */
export async function fetchAllPages<T>(
  client: ApiClient,
  path: string,
  query: RequestOptions['query'] = {},
): Promise<T[]> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: PageDto<T> = await fetchPage<T>(client, path, {
      ...query,
      limit: MAX_PAGE_SIZE,
      cursor,
    });
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor !== null) {
      if (seenCursors.has(cursor)) throw malformedPage();
      seenCursors.add(cursor);
    }
  } while (cursor !== null);
  return items;
}
