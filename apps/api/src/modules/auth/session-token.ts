import { createHash, randomBytes, randomInt } from 'node:crypto';

/**
 * Session tokens and reset codes, from Node's CSPRNG (`node:crypto`); no custom cryptography.
 *
 * A session token is 32 random bytes (256 bits), base64url: unguessable, so a fast SHA-256 is the right way to
 * store it (the database never holds a usable token). A slow hash is only needed for low-entropy secrets
 * (passwords, 6-digit codes — see PasswordHasher).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A 6-digit reset code, uniformly drawn (the mobile "Reset code" screen). */
export function generateResetCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** The token of an `Authorization: Bearer <token>` header, or `null`. */
export function bearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([A-Za-z0-9_-]{16,256})$/.exec(header.trim());
  return match ? match[1] : null;
}
