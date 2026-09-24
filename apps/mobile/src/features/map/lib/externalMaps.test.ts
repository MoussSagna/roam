import { formatCoordinates, getGoogleMapsUrl, getPlansUrl } from './externalMaps';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };

describe('externalMaps', () => {
  it('formats coordinates as a readable "lat, lng"', () => {
    expect(formatCoordinates(PARIS)).toBe('48.8566, 2.3522');
  });

  it('keeps up to 6 decimals and drops trailing zeros', () => {
    expect(formatCoordinates({ latitude: 48.85660012345, longitude: 2.35 })).toBe('48.8566, 2.35');
    expect(formatCoordinates({ latitude: -33.5, longitude: 151 })).toBe('-33.5, 151');
  });

  it('builds an Apple Plans link with the coordinates and the encoded label', () => {
    expect(getPlansUrl(PARIS, 'Café de la Fontaine')).toBe(
      'https://maps.apple.com/?ll=48.8566,2.3522&q=Caf%C3%A9%20de%20la%20Fontaine',
    );
  });

  it('builds a Google Maps link with the coordinates', () => {
    expect(getGoogleMapsUrl(PARIS)).toBe(
      'https://www.google.com/maps/search/?api=1&query=48.8566,2.3522',
    );
  });
});
