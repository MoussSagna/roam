import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getLocationPermission, requestCurrentLocation } from '@/hooks/useCurrentLocation';
import { ApiError, repositories } from '@/services';
import type { Experience, Mood, Recommendations } from '@/types';

import { FOR_YOU_LIMIT, useForYouRecommendations } from './useForYouRecommendations';

jest.mock('@/hooks/useCurrentLocation', () => ({
  getLocationPermission: jest.fn(),
  requestCurrentLocation: jest.fn(),
}));

const mockPermission = jest.mocked(getLocationPermission);
const mockLocate = jest.mocked(requestCurrentLocation);

const experience = (id: string) => ({ id, title: id }) as Experience;
const answer = (...ids: string[]): Recommendations => ({
  items: ids.map((id) => ({ experience: experience(id), reasons: [] })),
  relaxed: [],
});

describe('useForYouRecommendations (API-12)', () => {
  let recommend: jest.SpyInstance;

  beforeEach(() => {
    mockPermission.mockResolvedValue('unknown');
    mockLocate.mockReset();
    recommend = jest.spyOn(repositories.recommendations, 'recommend');
  });

  afterEach(() => {
    recommend.mockRestore();
  });

  it('loading, then the recommended experiences — one request, never a location it was not given', async () => {
    let resolve: (value: Recommendations) => void = () => {};
    recommend.mockReturnValue(new Promise<Recommendations>((done) => (resolve = done)));
    const { result } = await renderHook(() => useForYouRecommendations('calm'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.experiences).toEqual([]);
    await act(async () => resolve(answer('a', 'b')));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.experiences.map((item) => item.id)).toEqual(['a', 'b']);
    expect(result.current.error).toBeNull();
    expect(recommend).toHaveBeenCalledTimes(1);
    expect(recommend).toHaveBeenCalledWith({
      location: undefined,
      mood: 'calm',
      limit: FOR_YOU_LIMIT,
    });
    // Permission not granted: Home does not prompt.
    expect(mockLocate).not.toHaveBeenCalled();
  });

  it('sends the position when the permission is already granted, in the first and only request', async () => {
    mockPermission.mockResolvedValue('granted');
    mockLocate.mockResolvedValue({
      status: 'located',
      coordinates: { latitude: 48.86, longitude: 2.35 },
    });
    recommend.mockResolvedValue(answer('a'));

    const { result } = await renderHook(() => useForYouRecommendations('calm'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(recommend).toHaveBeenCalledTimes(1);
    expect(recommend.mock.calls[0][0].location).toEqual({ latitude: 48.86, longitude: 2.35 });
  });

  it('an empty answer is an empty list, not an error', async () => {
    recommend.mockResolvedValue(answer());
    const { result } = await renderHook(() => useForYouRecommendations('calm'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.experiences).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('a failure is an error (no mock data); retry asks again', async () => {
    const failure = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' });
    let resolveRetry: (value: Recommendations) => void = () => {};
    recommend
      .mockRejectedValueOnce(failure)
      .mockReturnValueOnce(new Promise<Recommendations>((done) => (resolveRetry = done)));
    const { result } = await renderHook(() => useForYouRecommendations('calm'));

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.experiences).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await act(() => result.current.retry());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => resolveRetry(answer('a')));
    await waitFor(() => expect(result.current.experiences.map((item) => item.id)).toEqual(['a']));
    expect(recommend).toHaveBeenCalledTimes(2);
  });

  it('asks again when the context changes, not on a re-render with the same context', async () => {
    let resolveFood: (value: Recommendations) => void = () => {};
    recommend
      .mockResolvedValueOnce(answer('calm-pick'))
      .mockReturnValueOnce(new Promise<Recommendations>((done) => (resolveFood = done)));
    const { result, rerender } = await renderHook(
      ({ mood }: { mood: Mood }) => useForYouRecommendations(mood),
      { initialProps: { mood: 'calm' as Mood } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await rerender({ mood: 'calm' });
    expect(recommend).toHaveBeenCalledTimes(1);

    await rerender({ mood: 'food' });
    // The previous ideas stay shown while the new context loads.
    expect(result.current.experiences.map((item) => item.id)).toEqual(['calm-pick']);
    await act(async () => resolveFood(answer('food-pick')));
    await waitFor(() =>
      expect(result.current.experiences.map((item) => item.id)).toEqual(['food-pick']),
    );
    expect(recommend).toHaveBeenCalledTimes(2);
    expect(recommend.mock.calls[1][0].mood).toBe('food');
  });
});
