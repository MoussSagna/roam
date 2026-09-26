import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Startup parameter of every connection: its session time zone is UTC.
 *
 * `@prisma/adapter-pg` (7.x) assumes a UTC session: it sends a `Date` as its UTC wall-clock time without an offset
 * (`2026-09-26 18:42:44.647`), which PostgreSQL reads in the session time zone, and it reads a `timestamptz` back by
 * replacing the offset PostgreSQL printed with `+00:00`. On a server whose time zone is not UTC (`Europe/Paris`
 * locally), every instant crossing the driver was shifted by that offset: a session expired an hour ago still
 * compared as valid against `expiresAt > now`. Forcing UTC per connection makes the adapter's assumption true
 * whatever the server, database or role defaults are.
 *
 * An `options` parameter inside the connection string would take precedence over this one: DATABASE_URL must not set
 * `TimeZone`.
 */
export const UTC_SESSION_OPTIONS = '-c TimeZone=UTC';

/** The only way the API (application, seed, tests) connects Prisma to PostgreSQL. */
export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString, options: UTC_SESSION_OPTIONS });
}
