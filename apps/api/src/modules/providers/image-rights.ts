import type { SourceImage } from '../catalog/catalog.types.js';

/**
 * Image rights (DATA_PERSISTENCE_AND_SYNC.md "Images and licensing"). An image is usable in the (commercial) ROAM app
 * only when its licence is known to allow it, its rights period covers the day of use, and — when a credit is given —
 * the credit is shown next to it. No licence = unknown = not usable by default.
 */
export type ImageUsage = 'ALLOWED' | 'FORBIDDEN' | 'UNKNOWN';

/** Licences allowing commercial display (credit required for CC BY / Licence Ouverte). */
const ALLOWED = [
  /licence ouverte/i,
  /\betalab\b/i,
  /^\s*lo\s*-?\s*2(\.0)?\s*$/i,
  /\bcc0\b/i,
  /public domain|domaine public/i,
  /^\s*(cc[\s-]*)?by(\s*[-\s]\s*sa)?(\s*\d(\.\d)?)?\s*$/i,
];
/** Non-commercial or no-derivatives licences: forbidden (ROAM resizes and crops images for display). */
const FORBIDDEN = [
  /\bnc\b/i,
  /non[\s-]?commercial/i,
  /\bnd\b/i,
  /no[\s-]?deriv/i,
  /pas de modification/i,
];

/** True when a licence explicitly excludes ROAM's use: providers drop such images before storing them. */
export function isForbiddenLicense(license: string | null): boolean {
  return license !== null && FORBIDDEN.some((pattern) => pattern.test(license));
}

/** Whether an image may be shown on `day` ("YYYY-MM-DD"). */
export function imageUsage(image: SourceImage, day: string): ImageUsage {
  if (image.rightsStartDate && day < image.rightsStartDate) return 'FORBIDDEN';
  if (image.rightsEndDate && day > image.rightsEndDate) return 'FORBIDDEN';
  if (image.license === null) return 'UNKNOWN';
  if (isForbiddenLicense(image.license)) return 'FORBIDDEN';
  return ALLOWED.some((pattern) => pattern.test(image.license!)) ? 'ALLOWED' : 'UNKNOWN';
}
