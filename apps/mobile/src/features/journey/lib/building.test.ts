import { act, renderHook } from '@testing-library/react-native';

import { PROFILE_STAGE } from '@/features/onboarding/profileCreation';

import {
  BUILD_PHASE,
  BUILD_RING_PROGRESS,
  BUILD_TIMELINE,
  orbitStageFor,
  useJourneyBuilding,
} from './building';

describe('journey building timeline (front-end simulation)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lasts between 2 and 4 seconds, stages in order', () => {
    const times = Object.values(BUILD_TIMELINE);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(BUILD_TIMELINE.navigate).toBeGreaterThanOrEqual(2000);
    expect(BUILD_TIMELINE.navigate).toBeLessThanOrEqual(4000);
  });

  it('moves through the phases at the planned times, then calls onFinish once', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() => useJourneyBuilding(onFinish));
    expect(result.current).toBe(BUILD_PHASE.intro);

    await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.start));
    expect(result.current).toBe(BUILD_PHASE.start);
    await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.done - BUILD_TIMELINE.start));
    expect(result.current).toBe(BUILD_PHASE.done);
    expect(onFinish).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTimeAsync(BUILD_TIMELINE.navigate - BUILD_TIMELINE.done));
    expect(onFinish).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTimeAsync(10_000));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('stops everything when the screen goes away', async () => {
    const onFinish = jest.fn();
    const { unmount } = await renderHook(() => useJourneyBuilding(onFinish));
    await act(() => jest.advanceTimersByTimeAsync(1000));
    await unmount();
    await act(() => jest.advanceTimersByTimeAsync(10_000));
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('drives the onboarding orbit through its stages, the ring filling up to 1', () => {
    expect(orbitStageFor(BUILD_PHASE.intro)).toBe(PROFILE_STAGE.intro);
    expect(orbitStageFor(BUILD_PHASE.start)).toBe(PROFILE_STAGE.analyzing);
    expect(orbitStageFor(BUILD_PHASE.building)).toBe(PROFILE_STAGE.thirdStep);
    expect(orbitStageFor(BUILD_PHASE.done)).toBe(PROFILE_STAGE.done);
    expect(orbitStageFor(BUILD_PHASE.leaving)).toBe(PROFILE_STAGE.leaving);

    const targets = Object.values(BUILD_RING_PROGRESS).map((step) => step.to);
    expect(targets).toEqual([...targets].sort((a, b) => a - b));
    expect(BUILD_RING_PROGRESS[PROFILE_STAGE.done].to).toBe(1);
  });
});
