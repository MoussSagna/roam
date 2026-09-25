import * as Location from 'expo-location';

import {
  getLocationPermission,
  LOCATION_TIMEOUT_MS,
  requestCurrentLocation,
} from './useCurrentLocation';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = jest.mocked(Location);

const UNDETERMINED = { granted: false, status: 'undetermined', canAskAgain: true };
const GRANTED = { granted: true, status: 'granted', canAskAgain: true };
const DENIED = { granted: false, status: 'denied', canAskAgain: true };
const BLOCKED = { granted: false, status: 'denied', canAskAgain: false };

const PARIS = { latitude: 48.8606, longitude: 2.3376 };

function permissionIs(response: object) {
  mocked.getForegroundPermissionsAsync.mockResolvedValue(response as never);
}

function positionIs(coords: object) {
  mocked.getCurrentPositionAsync.mockResolvedValue({ coords, timestamp: 0 } as never);
}

describe('current location', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the four permission states without prompting', async () => {
    for (const [response, expected] of [
      [UNDETERMINED, 'unknown'],
      [GRANTED, 'granted'],
      [DENIED, 'denied'],
      [BLOCKED, 'blocked'],
    ] as const) {
      permissionIs(response);
      expect(await getLocationPermission()).toBe(expected);
    }
    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('unknown permission: asks once, then reads the position', async () => {
    permissionIs(UNDETERMINED);
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(GRANTED as never);
    positionIs(PARIS);

    expect(await requestCurrentLocation()).toEqual({ status: 'located', coordinates: PARIS });
    expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    // Foreground only, and no more precision than needed.
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('granted permission: reads the position without asking again', async () => {
    permissionIs(GRANTED);
    positionIs(PARIS);

    expect(await requestCurrentLocation()).toEqual({ status: 'located', coordinates: PARIS });
    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('refused: reports it, without reading any position', async () => {
    permissionIs(UNDETERMINED);
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(DENIED as never);

    expect(await requestCurrentLocation()).toEqual({ status: 'denied' });
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('refused for good on the prompt: reported as blocked', async () => {
    permissionIs(UNDETERMINED);
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(BLOCKED as never);

    expect(await requestCurrentLocation()).toEqual({ status: 'blocked' });
  });

  it('blocked: never shows the system prompt again', async () => {
    permissionIs(BLOCKED);

    expect(await requestCurrentLocation()).toEqual({ status: 'blocked' });
    expect(await requestCurrentLocation()).toEqual({ status: 'blocked' });
    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('native error (location services off, no fix): unavailable, no throw', async () => {
    permissionIs(GRANTED);
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('Location services are disabled'));

    expect(await requestCurrentLocation()).toEqual({ status: 'unavailable' });
  });

  it('invalid coordinates: unavailable', async () => {
    permissionIs(GRANTED);
    positionIs({ latitude: Number.NaN, longitude: 2.3 });
    expect(await requestCurrentLocation()).toEqual({ status: 'unavailable' });

    positionIs({ latitude: 120, longitude: 2.3 });
    expect(await requestCurrentLocation()).toEqual({ status: 'unavailable' });
  });

  it('no answer in time: unavailable', async () => {
    jest.useFakeTimers();
    permissionIs(GRANTED);
    mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const result = requestCurrentLocation();
    await jest.advanceTimersByTimeAsync(LOCATION_TIMEOUT_MS);

    expect(await result).toEqual({ status: 'unavailable' });
    jest.useRealTimers();
  });
});
