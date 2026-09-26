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
