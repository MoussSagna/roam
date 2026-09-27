/**
 * Calendar dates ("YYYY-MM-DD") ↔ PostgreSQL `date` columns (DATA-6: date-only events).
 *
 * A calendar date is not an instant: it is carried as a string in the domain and never through local time. Prisma
 * represents a `date` column as a `Date` at 00:00 UTC of that day; only the UTC date part is meaningful, so both
 * directions go through UTC explicitly (the API process's time zone never matters — see prisma-adapter.ts for the
 * instant columns).
 */
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date "YYYY-MM-DD" (e.g. not 2026-02-30). */
export function isLocalDate(value: string): boolean {
  const match = LOCAL_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "HH:MM", 00:00–23:59. */
export function isLocalTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** A calendar date for a `date` column; `undefined`/`null` pass through. Throws on an invalid date. */
export function toDbDate(value: string): Date;
export function toDbDate(value: string | null): Date | null;
export function toDbDate(value: string | null | undefined): Date | null | undefined;
export function toDbDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) return value;
  if (!isLocalDate(value)) throw new RangeError(`invalid calendar date "${value}"`);
  return new Date(`${value}T00:00:00.000Z`);
}

/** A `date` column as a calendar date string. */
export function fromDbDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}
