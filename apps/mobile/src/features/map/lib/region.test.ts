import { DEFAULT_REGION, getRegionForCoordinates } from './region';

describe('getRegionForCoordinates', () => {
  it('falls back to the default (Paris) region when there is nothing to frame', () => {
    expect(getRegionForCoordinates([])).toEqual(DEFAULT_REGION);
  });

  it('centers on the bounding box and pads it so pins are not flush with the edge', () => {
    const region = getRegionForCoordinates([
      { latitude: 48.85, longitude: 2.3 },
      { latitude: 48.89, longitude: 2.4 },
    ]);

    expect(region.latitude).toBeCloseTo(48.87);
    expect(region.longitude).toBeCloseTo(2.35);
    expect(region.latitudeDelta).toBeCloseTo(0.06);
    expect(region.longitudeDelta).toBeCloseTo(0.15);
  });

  it('never zooms in past a minimum span (a single point, or points on top of each other)', () => {
    const region = getRegionForCoordinates([{ latitude: 48.86, longitude: 2.35 }]);

    expect(region).toEqual({
      latitude: 48.86,
      longitude: 2.35,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  });
});
