import { testDatabaseUrl } from './test-database-url.js';

// Same deterministic environment as the unit tests (test/setup-env.ts), but DATABASE_URL is the dedicated
// test database: the application under test connects to it exactly as it would in development.
const url = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.CORS_ORIGINS = 'http://localhost:8081';
delete process.env.PORT;
delete process.env.LOG_LEVEL;
delete process.env.SWAGGER_ENABLED;

// Rate limiting stays on in the tests, with limits no suite reaches: every request of a test file comes from one IP
// (127.0.0.1). test/rate-limit.e2e.spec.ts sets low limits to test the mechanism itself.
process.env.RATE_LIMIT_ENABLED = 'true';
for (const tier of ['IP', 'CLIENT', 'AUTH', 'MUTATION'])
  process.env[`RATE_LIMIT_${tier}_LIMIT`] = '100000';
delete process.env.TRUST_PROXY;
