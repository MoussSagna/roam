import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher (Argon2id)', () => {
  const hasher = new PasswordHasher();
  const password = 'fictional-Passw0rd';

  it('hashes with Argon2id and the OWASP parameters, salted, never containing the password', async () => {
    const [first, second] = [await hasher.hash(password), await hasher.hash(password)];

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second); // a random salt per hash
    expect(first).not.toContain(password);
  });

  it('verifies the right password only', async () => {
    const stored = await hasher.hash(password);
    expect(await hasher.verify(stored, password)).toBe(true);
    expect(await hasher.verify(stored, 'fictional-Passw0rD')).toBe(false);
  });

  it('never throws on a malformed hash', async () => {
    expect(await hasher.verify('not-a-hash', password)).toBe(false);
  });

  it('verifyNothing always fails (unknown account), after a real verification', async () => {
    expect(await hasher.verifyNothing(password)).toBe(false);
  });
});
