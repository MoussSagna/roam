/**
 * The database of the integration tests (`pnpm test:db`): `DATABASE_TEST_URL`, from the environment or
 * `apps/api/.env`. Tests empty its tables, so it must be a dedicated database: its name must end with
 * `_test` and differ from the development database (`DATABASE_URL`). Anything else stops the run before
 * a single query.
 */
export function testDatabaseUrl(): string {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file: rely on the process environment (CI).
  }

  const url = process.env.DATABASE_TEST_URL;
  if (!url) {
    throw new Error(
      'DATABASE_TEST_URL is not set: the database integration tests need a dedicated PostgreSQL database ' +
        '(see apps/api/.env.example and apps/api/apidocs/DATABASE_SCHEMA.md → "Tests").',
    );
  }

  const name = databaseName(url);
  if (!name.endsWith('_test')) {
    throw new Error(`DATABASE_TEST_URL must name a database ending with "_test" (got "${name}").`);
  }
  const development = process.env.DATABASE_URL;
  if (development && databaseName(development) === name && sameServer(development, url)) {
    throw new Error('DATABASE_TEST_URL must not point at the development database (DATABASE_URL).');
  }
  return url;
}

function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

function sameServer(a: string, b: string): boolean {
  const [x, y] = [new URL(a), new URL(b)];
  return x.hostname === y.hostname && (x.port || '5432') === (y.port || '5432');
}

/** A connection string with its password hidden, for error messages. */
export function redact(text: string): string {
  return text.replace(/(postgres(?:ql)?:\/\/[^:/@\s]+:)[^@\s]*@/g, '$1***@');
}
