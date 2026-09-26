import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { type Algorithm, hash, verify } from '@node-rs/argon2';

/** `Algorithm.Argon2id` (a const enum, not importable as a value under `isolatedModules`); checked by a test. */
const ARGON2ID = 2 as Algorithm;

/**
 * Argon2id with the OWASP Password Storage Cheat Sheet's baseline: 19 MiB of memory, 2 iterations, 1 lane.
 * Parameters are stored in each hash (PHC string: `$argon2id$v=19$m=19456,t=2,p=1$…`), so raising them later
 * only affects new hashes; old ones keep verifying.
 */
export const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hashes and verifies secrets chosen or received by users (passwords, reset codes) with a standard library
 * (`@node-rs/argon2`) — no cryptography written here.
 */
@Injectable()
export class PasswordHasher {
  /** A hash of a random value, to spend the same time when there is nothing to compare against. */
  private readonly dummyHash = hash(randomBytes(32).toString('hex'), ARGON2_OPTIONS);

  hash(secret: string): Promise<string> {
    return hash(secret, ARGON2_OPTIONS);
  }

  /** `false` for a wrong secret or a malformed hash; never throws. */
  async verify(storedHash: string, secret: string): Promise<boolean> {
    try {
      return await verify(storedHash, secret);
    } catch {
      return false;
    }
  }

  /**
   * Runs a verification that always fails, taking as long as a real one: an unknown email must not answer
   * faster than a wrong password (account enumeration by timing).
   */
  async verifyNothing(secret: string): Promise<false> {
    await this.verify(await this.dummyHash, secret);
    return false;
  }
}
