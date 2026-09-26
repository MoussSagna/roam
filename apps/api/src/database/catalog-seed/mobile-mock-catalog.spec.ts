import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  MOBILE_MOCK_CATALOG,
  type MockCategory,
  type MockExperience,
  type MockPlace,
} from './mobile-mock-catalog.js';

/**
 * The migration source against the real mobile file: every mock category, place and experience of
 * `apps/mobile/src/services/mock/data.ts` is in the migration source with the same values, and nothing else is.
 * The mobile file cannot be imported here (React Native `require()` of images), so its literal objects are read as
 * text — enough for its simple, one-value-per-line layout.
 */
const MOBILE_DATA = resolve(import.meta.dirname, '../../../../mobile/src/services/mock/data.ts');
const source = readFileSync(MOBILE_DATA, 'utf8');

/** The literal array `export const <name>: <Type>[] = [ … ];`. */
function arrayBlock(name: string): string {
  const start = source.indexOf(`export const ${name}:`);
  expect(start, `no "${name}" array in the mobile mock data`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n];', start);
  return source.slice(start, end);
}

/** The top-level objects of an array block (two-space indented `{`). */
function objects(block: string): string[] {
  return block.split(/\n {2}\{\n/).slice(1);
}

const text = (chunk: string, field: string) =>
  chunk.match(new RegExp(`(?:^|\\n)\\s+${field}: '([^']*)'`))?.[1];
const number = (chunk: string, field: string) => {
  const value = chunk.match(new RegExp(`(?:^|\\n)\\s+${field}: ([\\d.]+)`))?.[1];
  return value === undefined ? undefined : Number(value);
};
const list = (chunk: string, field: string) => {
  const inner = chunk.match(new RegExp(`(?:^|\\n)\\s+${field}: \\[([^\\]]*)\\]`))?.[1];
  return inner === undefined
    ? undefined
    : [...inner.matchAll(/'([^']*)'/g)].map((match) => match[1]);
};
const coordinates = (chunk: string) => {
  const match = chunk.match(/coordinates: \{ latitude: ([\d.]+), longitude: ([\d.]+) \}/);
  return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : undefined;
};
const withoutUndefined = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, inner]) => inner !== undefined)) as T;

describe('DATA-1 migration source ↔ mobile mock data', () => {
  it('has every mobile category, with the same slug', () => {
    const mobile: MockCategory[] = [
      ...arrayBlock('categories').matchAll(/\{ id: '([^']+)', slug: '([^']+)' \}/g),
    ].map((match) => ({ id: match[1], slug: match[2] }));
    expect(mobile).toHaveLength(7);
    expect(MOBILE_MOCK_CATALOG.categories).toEqual(mobile);
  });

  it('has every mobile place, with the same values', () => {
    const mobile = objects(arrayBlock('places')).map((chunk): MockPlace => ({
      id: text(chunk, 'id')!,
      name: text(chunk, 'name')!,
      categoryId: text(chunk, 'categoryId')!,
      description: text(chunk, 'description')!,
      address: text(chunk, 'address')!,
      coordinates: coordinates(chunk)!,
      price: text(chunk, 'price') as MockPlace['price'],
      tags: list(chunk, 'tags')!,
    }));
    expect(mobile).toHaveLength(2);
    expect(MOBILE_MOCK_CATALOG.places).toEqual(mobile);
  });

  it('has every mobile experience, in the same order, with the same migrated values', () => {
    const mobile = objects(arrayBlock('experiences')).map((chunk) =>
      withoutUndefined<MockExperience>({
        id: text(chunk, 'id')!,
        title: text(chunk, 'title')!,
        description: text(chunk, 'description')!,
        moods: list(chunk, 'moods')!,
        categoryIds: list(chunk, 'categoryIds')!,
        placeIds: list(chunk, 'placeIds')!,
        estimatedDurationMin: number(chunk, 'estimatedDurationMin')!,
        estimatedBudget: text(chunk, 'estimatedBudget') as MockExperience['estimatedBudget'],
        coordinates: coordinates(chunk),
        address: text(chunk, 'address'),
        rating: number(chunk, 'rating'),
        reviewCount: number(chunk, 'reviewCount'),
        tags: list(chunk, 'tags'),
      }),
    );
    expect(mobile).toHaveLength(14);
    expect(MOBILE_MOCK_CATALOG.experiences).toEqual(mobile);
  });

  it('holds no event: no mobile experience carries a date or a schedule', () => {
    for (const chunk of objects(arrayBlock('experiences'))) {
      expect(chunk).not.toMatch(/\n\s+(startDate|endDate|date|startsAt|schedule):/);
    }
  });
});
