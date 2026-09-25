// Deterministic environment for every test: no .env file, no real database. The URL points at a
// port nothing listens on, so any accidental connection fails fast instead of hanging.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://roam:roam@127.0.0.1:1/roam_test';
process.env.CORS_ORIGINS = 'http://localhost:8081';
delete process.env.PORT;
delete process.env.LOG_LEVEL;
delete process.env.SWAGGER_ENABLED;
