import http from 'node:http';

// Deterministic environment for every test: no .env file, no real database. The URL points at a
// port nothing listens on, so any accidental connection fails fast instead of hanging.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://roam:roam@127.0.0.1:1/roam_test';
process.env.CORS_ORIGINS = 'http://localhost:8081';
delete process.env.PORT;
delete process.env.LOG_LEVEL;
delete process.env.SWAGGER_ENABLED;

// No keep-alive for the HTTP tests' requests (supertest uses Node's global agent, keep-alive by default since Node 19).
// Supertest starts a server per request and closes it; a kept-alive socket outlives that server, and the worker process
// runs other test files next with the same global agent. When the OS hands out the same port again, the agent reused the
// stale socket and the request reached the previous file's application (a 401 instead of the expected answer, or a hung
// request). One connection per request makes each request reach its own server.
http.globalAgent = new http.Agent({ keepAlive: false });
