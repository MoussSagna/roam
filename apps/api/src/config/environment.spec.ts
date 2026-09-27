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

  it('rate limiting: on by default with its default limits; configurable; invalid values refused', () => {
    const defaults = validateEnvironment(VALID);
    expect(defaults).toMatchObject({
      RATE_LIMIT_ENABLED: true,
      RATE_LIMIT_IP_LIMIT: 300,
      RATE_LIMIT_CLIENT_LIMIT: 120,
      RATE_LIMIT_AUTH_LIMIT: 10,
      RATE_LIMIT_AUTH_TTL_SECONDS: 900,
      RATE_LIMIT_MUTATION_LIMIT: 30,
      TRUST_PROXY: 0,
    });

    const custom = validateEnvironment({
      ...VALID,
      RATE_LIMIT_ENABLED: 'false',
      RATE_LIMIT_AUTH_LIMIT: '3',
      RATE_LIMIT_AUTH_TTL_SECONDS: '',
      TRUST_PROXY: '1',
    });
    expect(custom).toMatchObject({
      RATE_LIMIT_ENABLED: false,
      RATE_LIMIT_AUTH_LIMIT: 3,
      RATE_LIMIT_AUTH_TTL_SECONDS: 900,
      TRUST_PROXY: 1,
    });

    expect(() =>
      validateEnvironment({ ...VALID, RATE_LIMIT_IP_LIMIT: '0', TRUST_PROXY: 'all' }),
    ).toThrow(/RATE_LIMIT_IP_LIMIT[\s\S]*TRUST_PROXY/);
  });

  it('Google Places key: optional (the API starts without it), a single token when set, never printed', () => {
    expect(validateEnvironment(VALID).GOOGLE_PLACES_API_KEY).toBeUndefined();
    expect(
      validateEnvironment({ ...VALID, GOOGLE_PLACES_API_KEY: 'AIzaFAKE-key_0123' })
        .GOOGLE_PLACES_API_KEY,
    ).toBe('AIzaFAKE-key_0123');

    const malformed = 'AIzaFAKE key with spaces';
    let message = '';
    try {
      validateEnvironment({ ...VALID, GOOGLE_PLACES_API_KEY: malformed });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/GOOGLE_PLACES_API_KEY: GOOGLE_PLACES_API_KEY must be a single token/);
    expect(message).not.toContain(malformed);
  });

  it('Geoapify key: optional, a single token when set, never printed', () => {
    expect(
      validateEnvironment({ ...VALID, GEOAPIFY_API_KEY: '' }).GEOAPIFY_API_KEY,
    ).toBeUndefined();
    expect(
      validateEnvironment({ ...VALID, GEOAPIFY_API_KEY: 'geoFAKE0123abcd' }).GEOAPIFY_API_KEY,
    ).toBe('geoFAKE0123abcd');

    const malformed = 'geoFAKE key&with=chars';
    let message = '';
    try {
      validateEnvironment({ ...VALID, GEOAPIFY_API_KEY: malformed });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/GEOAPIFY_API_KEY: GEOAPIFY_API_KEY must be a single token/);
    expect(message).not.toContain(malformed);
  });

  it('Ticketmaster key: optional, a single token when set, never printed', () => {
    expect(
      validateEnvironment({ ...VALID, TICKETMASTER_API_KEY: '' }).TICKETMASTER_API_KEY,
    ).toBeUndefined();
    expect(
      validateEnvironment({ ...VALID, TICKETMASTER_API_KEY: 'tmFAKE0123abcd' })
        .TICKETMASTER_API_KEY,
    ).toBe('tmFAKE0123abcd');

    const malformed = 'tmFAKE key&apikey=x';
    let message = '';
    try {
      validateEnvironment({ ...VALID, TICKETMASTER_API_KEY: malformed });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/TICKETMASTER_API_KEY: TICKETMASTER_API_KEY must be a single token/);
    expect(message).not.toContain(malformed);
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
