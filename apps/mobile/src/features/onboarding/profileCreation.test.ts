import { act, renderHook } from '@testing-library/react-native';

import {
  PROFILE_STAGE,
  type ProfileStage,
  PROFILE_STEPS,
  PROFILE_TIMELINE,
  RING_PROGRESS,
  useProfileCreation,
} from './profileCreation';

describe('profile creation timeline (front-end simulation)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lasts about ten seconds and lists the stages in order', () => {
    const times = Object.values(PROFILE_TIMELINE);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(PROFILE_TIMELINE.navigate).toBeGreaterThanOrEqual(10000);
    expect(PROFILE_TIMELINE.navigate).toBeLessThanOrEqual(10500);
    expect(PROFILE_STEPS).toEqual(['analysis', 'recommendations', 'experience']);
  });

  it('moves through the stages at the planned times', async () => {
    const { result } = await renderHook(() => useProfileCreation(jest.fn()));
    expect(result.current).toBe(PROFILE_STAGE.intro);

    const expectations: [number, number][] = [
      [PROFILE_TIMELINE.analyzing, PROFILE_STAGE.analyzing],
      [PROFILE_TIMELINE.firstStep, PROFILE_STAGE.firstStep],
      [PROFILE_TIMELINE.secondStep, PROFILE_STAGE.secondStep],
      [PROFILE_TIMELINE.thirdStep, PROFILE_STAGE.thirdStep],
      [PROFILE_TIMELINE.done, PROFILE_STAGE.done],
      [PROFILE_TIMELINE.leaving, PROFILE_STAGE.leaving],
    ];
    let elapsed = 0;
    for (const [at, stage] of expectations) {
      await act(() => jest.advanceTimersByTimeAsync(at - elapsed - 1));
      expect(result.current).toBe(stage - 1);
      await act(() => jest.advanceTimersByTimeAsync(1));
      expect(result.current).toBe(stage);
      elapsed = at;
    }
  });

  it('calls onFinish once, at the end, and never twice', async () => {
    const onFinish = jest.fn();
    await renderHook(() => useProfileCreation(onFinish));

    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.navigate - 1));
    expect(onFinish).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTimeAsync(1));
    expect(onFinish).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTimeAsync(60000));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  /** The timers of the sequence: 6 stages and the navigation, told apart from React's own timers by their delay. */
  const sequenceDelays = new Set<number>(Object.values(PROFILE_TIMELINE));
  const sequenceTimers = (spy: jest.SpyInstance) =>
    spy.mock.calls.filter(([, delay]) => sequenceDelays.has(delay as number));

  it('starts the sequence once, even when the component re-renders', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const onFinish = jest.fn();
    const { rerender } = await renderHook<ProfileStage, { cb: () => void }>(
      ({ cb }) => useProfileCreation(cb),
      { initialProps: { cb: onFinish } },
    );
    expect(sequenceTimers(setTimeoutSpy)).toHaveLength(7);

    await rerender({ cb: jest.fn() });
    await rerender({ cb: onFinish });
    expect(sequenceTimers(setTimeoutSpy)).toHaveLength(7);
    setTimeoutSpy.mockRestore();
  });

  it('clears every timer of the sequence on unmount and never navigates afterwards', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const onFinish = jest.fn();
    const { unmount } = await renderHook(() => useProfileCreation(onFinish));
    const startedIds = setTimeoutSpy.mock.results
      .filter((_, index) => sequenceDelays.has(setTimeoutSpy.mock.calls[index]![1] as number))
      .map((result) => result.value);
    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.firstStep));

    await unmount();
    const clearedIds = clearTimeoutSpy.mock.calls.map(([id]) => id);
    for (const id of startedIds) expect(clearedIds).toContain(id);

    await act(() => jest.advanceTimersByTimeAsync(20000));
    expect(onFinish).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('restarts from the beginning when the screen is mounted again', async () => {
    const first = await renderHook(() => useProfileCreation(jest.fn()));
    await act(() => jest.advanceTimersByTimeAsync(PROFILE_TIMELINE.thirdStep));
    expect(first.result.current).toBe(PROFILE_STAGE.thirdStep);
    await first.unmount();

    const second = await renderHook(() => useProfileCreation(jest.fn()));
    expect(second.result.current).toBe(PROFILE_STAGE.intro);
  });

  it('fills the loader ring progressively up to 100 %', () => {
    const targets = Object.values(RING_PROGRESS).map((step) => step.to);
    expect(targets).toEqual([...targets].sort((a, b) => a - b));
    expect(RING_PROGRESS[PROFILE_STAGE.thirdStep].to).toBeGreaterThan(0.9);
    expect(RING_PROGRESS[PROFILE_STAGE.done].to).toBe(1);
  });
});
