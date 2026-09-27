import { imageUsage, isForbiddenLicense } from './image-rights.js';

const image = (license: string | null, rights: { start?: string; end?: string } = {}) => ({
  url: 'https://img/a.jpg',
  license,
  credit: '© Photographe',
  rightsStartDate: rights.start ?? null,
  rightsEndDate: rights.end ?? null,
});

describe('image rights', () => {
  it('known open licences are allowed (with their credit)', () => {
    for (const license of [
      'Licence Ouverte 2.0',
      'LO 2.0',
      'CC BY 4.0',
      'By-SA',
      'CC0',
      'Domaine public',
    ])
      expect(imageUsage(image(license), '2026-09-27')).toBe('ALLOWED');
  });

  it('non-commercial or no-derivatives licences are forbidden (DATAtourisme "By-NC-ND 4.0" observed)', () => {
    expect(isForbiddenLicense('By-NC-ND 4.0')).toBe(true);
    expect(isForbiddenLicense('CC BY-ND')).toBe(true);
    expect(isForbiddenLicense('CC BY 4.0')).toBe(false);
    expect(imageUsage(image('By-NC-ND 4.0'), '2026-09-27')).toBe('FORBIDDEN');
  });

  it('an image without a licence is not usable by default; an unrecognized licence neither', () => {
    expect(imageUsage(image(null), '2026-09-27')).toBe('UNKNOWN');
    expect(imageUsage(image('Tous droits réservés'), '2026-09-27')).toBe('UNKNOWN');
  });

  it('outside its rights period an image is forbidden, whatever its licence', () => {
    expect(imageUsage(image('CC BY', { end: '2026-01-31' }), '2026-09-27')).toBe('FORBIDDEN');
    expect(imageUsage(image('CC BY', { start: '2027-01-01' }), '2026-09-27')).toBe('FORBIDDEN');
    expect(
      imageUsage(image('CC BY', { start: '2026-01-01', end: '2026-12-31' }), '2026-09-27'),
    ).toBe('ALLOWED');
  });
});
