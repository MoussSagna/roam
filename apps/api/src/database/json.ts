import { Prisma } from '../generated/prisma/client.js';

/** A JSON value as stored in a `Json` column (opening hours, provider attributes, enrichment confidence). */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * A JSON value for a Prisma write: `undefined` leaves the column unchanged, `null` stores SQL NULL (Prisma
 * needs `DbNull` for that), anything else is stored as is.
 */
export function jsonInput(
  value: JsonValue | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value;
}

/** A JSON column as read by Prisma, typed for the domain. */
export function jsonOutput(value: Prisma.JsonValue | null): JsonValue | null {
  return value as JsonValue | null;
}

/** A `Decimal` column (prices) as a number: two decimals, exact enough for display and budget sums. */
export function decimalOutput(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}
