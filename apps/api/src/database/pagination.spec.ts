import { PAGE_SIZE, pageArgs, toPage } from './pagination.js';
import { InvalidCursorError } from './persistence-errors.js';

const CURSOR = '01a0db2f-89fd-753b-ac18-ae6711389bb9';

describe('pagination', () => {
  it('first page: the default size, plus one row to detect a next page', () => {
    expect(pageArgs()).toEqual({ limit: PAGE_SIZE.default, args: { take: 21 } });
  });

  it('next page: starts after the cursor', () => {
    expect(pageArgs({ limit: 5, cursor: CURSOR })).toEqual({
      limit: 5,
      args: { take: 6, cursor: { id: CURSOR }, skip: 1 },
    });
  });

  it('keeps the size between 1 and the maximum', () => {
    expect(pageArgs({ limit: 0 }).limit).toBe(1);
    expect(pageArgs({ limit: 10_000 }).limit).toBe(PAGE_SIZE.max);
    expect(pageArgs({ limit: 7.9 }).limit).toBe(7);
  });

  it('refuses a cursor that is not an id', () => {
    expect(() => pageArgs({ cursor: "1' OR 1=1" })).toThrow(InvalidCursorError);
  });

  it('toPage: cuts the extra row and points at the last item', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(toPage(rows, 2, (row) => row.id)).toEqual({ items: ['a', 'b'], nextCursor: 'b' });
    expect(toPage(rows, 3, (row) => row.id)).toEqual({ items: ['a', 'b', 'c'], nextCursor: null });
  });
});
