import { NodeEnv, validateEnvironment } from './environment.js';

const VALID = { DATABASE_URL: 'postgresql://user:pass@db.example:5432/roam' };

describe('validateEnvironment', () => {
  it('accepts a minimal environment and applies the defaults', () => {
    const env = validateEnvironment(VALID);

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.SWAGGER_ENABLED).toBeUndefined();
  });

  it('converts the declared types', () => {
    const env = validateEnvironment({ ...VALID, PORT: '8080', SWAGGER_ENABLED: 'false' });

    expect(env.PORT).toBe(8080);
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('treats empty optional values as unset (a copied .env.example is valid)', () => {
    const env = validateEnvironment({
      ...VALID,
      LOG_LEVEL: '',
      GOOGLE_PLACES_API_KEY: '',
      AUTH_SESSION_TTL_DAYS: '',
    });

    expect(env.LOG_LEVEL).toBeUndefined();
    expect(env.GOOGLE_PLACES_API_KEY).toBeUndefined();
    expect(env.AUTH_SESSION_TTL_DAYS).toBe(30);
  });

  it('fails clearly when DATABASE_URL is missing', () => {
    expect(() => validateEnvironment({})).toThrow(/Invalid API configuration:\n\s+- DATABASE_URL:/);
  });

  it('names every invalid variable and its rule', () => {
    let message = '';
    try {
      validateEnvironment({ DATABASE_URL: 'mysql://x', PORT: '70000', NODE_ENV: 'staging' });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(
      /DATABASE_URL: DATABASE_URL must be a postgresql:\/\/ connection string/,
    );
    expect(message).toMatch(/PORT:/);
    expect(message).toMatch(/NODE_ENV:/);
  });

  it('never prints the values it rejects (secrets stay out of the logs)', () => {
    const secret = 'not-a-number-s3cret';
    let message = '';
    try {
      validateEnvironment({
        DATABASE_URL: 'not-a-url-with-p4ssw0rd',
        AUTH_SESSION_TTL_DAYS: secret,
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/AUTH_SESSION_TTL_DAYS:/);
    expect(message).not.toContain(secret);
    expect(message).not.toContain('p4ssw0rd');
  });
});
