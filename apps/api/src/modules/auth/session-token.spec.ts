import {
  bearerToken,
  generateResetCode,
  generateSessionToken,
  hashSessionToken,
} from './session-token.js';

describe('session tokens and reset codes', () => {
  it('a token is 32 random bytes in base64url, different every time', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateSessionToken));
    expect(tokens.size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    }
  });

  it('stores a token as its SHA-256 (64 hex), deterministic, never the token itself', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });

  it('a reset code is 6 digits, zero-padded', () => {
    for (let i = 0; i < 200; i += 1) expect(generateResetCode()).toMatch(/^\d{6}$/);
  });

  it('reads a bearer token from the Authorization header, nothing else', () => {
    const token = generateSessionToken();
    expect(bearerToken(`Bearer ${token}`)).toBe(token);
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken(`Basic ${token}`)).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
    expect(bearerToken('Bearer short')).toBeNull();
    expect(bearerToken(`Bearer ${token} extra`)).toBeNull();
    expect(bearerToken([`Bearer ${token}`])).toBeNull();
  });
});
