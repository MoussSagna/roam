import { createHash } from 'node:crypto';

/**
 * Namespace of the DATA-1 migration ids (a fixed random UUID). Changing it changes every migrated id: never do it
 * once a database has been seeded.
 */
const CATALOG_SEED_NAMESPACE = '6f1c2b1e-3d4a-4e8b-9a57-2c0d9e4b7f31';

function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

/** RFC 9562 UUID version 5 (SHA-1, name-based): the same name always gives the same id. */
export function uuidV5(name: string, namespace: string): string {
  const hash = createHash('sha1').update(uuidBytes(namespace)).update(name, 'utf8').digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The id of a migrated record: derived from its kind and its mobile id, so every run, every database (`roam`,
 * `roam_test`) and every machine gives the same id. Rows the migration does not create keep the schema's UUID v7.
 */
export function catalogId(kind: 'category' | 'place' | 'experience' | 'provider', key: string) {
  return uuidV5(`${kind}:${key}`, CATALOG_SEED_NAMESPACE);
}
