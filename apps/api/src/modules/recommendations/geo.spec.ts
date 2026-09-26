import { boundingBox, distanceMeters } from './geo.js';

const LOUVRE = { latitude: 48.8606, longitude: 2.3376 };
const NOTRE_DAME = { latitude: 48.853, longitude: 2.3499 };

describe('geo', () => {
  it('distance in meters (haversine): Louvre → Notre-Dame ≈ 1.2 km, symmetric, zero on itself', () => {
    const d = distanceMeters(LOUVRE, NOTRE_DAME);
    expect(d).toBeGreaterThan(1150);
    expect(d).toBeLessThan(1300);
    expect(distanceMeters(NOTRE_DAME, LOUVRE)).toBe(d);
    expect(distanceMeters(LOUVRE, LOUVRE)).toBe(0);
  });

  it('the bounding box contains every point at the radius, in the four directions', () => {
    const box = boundingBox(LOUVRE, 5000);
    const step = 5000 / 111_195;
    const lngStep = step / Math.cos((LOUVRE.latitude * Math.PI) / 180);
    for (const point of [
      { latitude: LOUVRE.latitude + step * 0.999, longitude: LOUVRE.longitude },
      { latitude: LOUVRE.latitude - step * 0.999, longitude: LOUVRE.longitude },
      { latitude: LOUVRE.latitude, longitude: LOUVRE.longitude + lngStep * 0.999 },
      { latitude: LOUVRE.latitude, longitude: LOUVRE.longitude - lngStep * 0.999 },
    ]) {
      expect(distanceMeters(LOUVRE, point)).toBeLessThanOrEqual(5000);
      expect(point.latitude).toBeGreaterThanOrEqual(box.minLatitude);
      expect(point.latitude).toBeLessThanOrEqual(box.maxLatitude);
      expect(point.longitude).toBeGreaterThanOrEqual(box.minLongitude);
      expect(point.longitude).toBeLessThanOrEqual(box.maxLongitude);
    }
  });
});
