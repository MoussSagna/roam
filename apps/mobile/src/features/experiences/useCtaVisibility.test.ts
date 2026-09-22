import { act, renderHook } from '@testing-library/react-native';

import { useCtaVisibility } from './useCtaVisibility';

describe('useCtaVisibility', () => {
  it('starts visible', async () => {
    const { result } = await renderHook(() => useCtaVisibility());
    expect(result.current.visible).toBe(true);
  });

  it('hides once a sustained downward scroll passes the threshold', async () => {
    const { result } = await renderHook(() => useCtaVisibility());

    await act(() => result.current.handleScrollOffset(100));

    expect(result.current.visible).toBe(false);
  });

  it('does not hide on small scrolls that stay below the threshold', async () => {
    const { result } = await renderHook(() => useCtaVisibility());

    await act(() => result.current.handleScrollOffset(6));
    await act(() => result.current.handleScrollOffset(10));

    expect(result.current.visible).toBe(true);
  });

  it('shows again immediately on any upward scroll, without needing a threshold', async () => {
    const { result } = await renderHook(() => useCtaVisibility());

    await act(() => result.current.handleScrollOffset(100));
    expect(result.current.visible).toBe(false);

    await act(() => result.current.handleScrollOffset(95));

    expect(result.current.visible).toBe(true);
  });

  it('shows again once the scroll gesture ends, even after a sustained downward scroll', async () => {
    const { result } = await renderHook(() => useCtaVisibility());

    await act(() => result.current.handleScrollOffset(100));
    expect(result.current.visible).toBe(false);

    await act(() => result.current.handleScrollEnd());

    expect(result.current.visible).toBe(true);
  });

  it('resets the downward accumulator once it shows again, instead of carrying it over', async () => {
    const { result } = await renderHook(() => useCtaVisibility());

    await act(() => result.current.handleScrollOffset(10)); // down +10
    await act(() => result.current.handleScrollEnd()); // shows again, accumulator reset
    await act(() => result.current.handleScrollOffset(20)); // down +10 (fresh, not 10+10=20)

    expect(result.current.visible).toBe(true);
  });
});
