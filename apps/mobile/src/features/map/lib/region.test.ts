import { DEFAULT_REGION, getFocusedRegion, getRegionForCoordinates } from './region';

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

describe('getFocusedRegion', () => {
  const REGION = { latitude: 48.8, longitude: 2.3, latitudeDelta: 0.08, longitudeDelta: 0.05 };
  const POINT = { latitude: 48.87, longitude: 2.35 };

  it('centers on the point and keeps the current zoom', () => {
    const region = getFocusedRegion(POINT, REGION, 800, { top: 0, bottom: 0 });

    expect(region).toEqual({ ...POINT, latitudeDelta: 0.08, longitudeDelta: 0.05 });
  });

  it('shifts the center so the point sits in the middle of the area between header and footer', () => {
    // Useful area: 100 → 500 px on an 800 px map, so its middle (300) is 100 px above the map's
    // middle (400) → the camera center goes 100 px *below* the point: 100 × 0.08 / 800 = 0.01°.
    const region = getFocusedRegion(POINT, REGION, 800, { top: 100, bottom: 300 });

    expect(region.latitude).toBeCloseTo(48.86, 6);
    expect(region.longitude).toBe(2.35);
  });

  it('moves the center up when the header is taller than the footer', () => {
    expect(getFocusedRegion(POINT, REGION, 800, { top: 300, bottom: 100 }).latitude).toBeCloseTo(
      48.88,
      6,
    );
  });

  it('does not shift (nor divide by zero) before the map has a height', () => {
    expect(getFocusedRegion(POINT, REGION, 0, { top: 100, bottom: 300 }).latitude).toBe(48.87);
  });
});
