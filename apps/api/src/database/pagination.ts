import { InvalidCursorError } from './persistence-errors.js';

/**
 * Keyset (cursor) pagination for repository lists — the internal contract; the public one is decided with the
 * first list endpoint (REPOSITORY_ARCHITECTURE.md → "Pagination"). The cursor is the id of the last item of the
 * previous page: stable while records are added, and ids are UUID v7 (time-ordered).
 */
export type PageRequest = {
  /** Items per page: default 20, at most 100. */
  limit?: number;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
};

export type Page<T> = {
  items: T[];
  /** Pass it as `cursor` to get the next page; `null` on the last page. */
  nextCursor: string | null;
};

export const PAGE_SIZE = { default: 20, max: 100 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prisma arguments for one page: one extra row tells whether another page exists. */
export function pageArgs(request: PageRequest = {}) {
  const limit = Math.min(
    Math.max(Math.trunc(request.limit ?? PAGE_SIZE.default), 1),
    PAGE_SIZE.max,
  );
  if (request.cursor !== undefined && !UUID.test(request.cursor)) throw new InvalidCursorError();
  return {
    limit,
    args: {
      take: limit + 1,
      ...(request.cursor ? { cursor: { id: request.cursor }, skip: 1 } : {}),
    },
  };
}

/** Cuts the extra row and maps the page. Rows must be in the order the cursor follows. */
export function toPage<Row extends { id: string }, T>(
  rows: Row[],
  limit: number,
  map: (row: Row) => T,
): Page<T> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: pageRows.map(map),
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}
