import { act, renderHook, screen } from '@testing-library/react-native';

import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { renderWithProviders } from '@/test/renderWithProviders';
import { darkColors, lightColors } from '@/theme/tokens';

import { LoadingSpinner } from './LoadingSpinner';
import { Skeleton, SKELETON_PULSE_MIN_OPACITY, SKELETON_PULSE_MS, skeletonPulse } from './Skeleton';

describe('Skeleton', () => {
  it.each([
    ['light', lightColors.border],
    ['dark', darkColors.border],
  ] as const)(
    '%s theme: a block in the theme border color, at the size it is given',
    async (theme, color) => {
      await renderWithProviders(<Skeleton testID="skeleton" style={{ width: 120, height: 14 }} />, {
        themePreference: theme,
      });

      expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).toHaveStyle({
        width: 120,
        height: 14,
      });
      expect(screen.getByTestId('skeleton-block', { includeHiddenElements: true })).toHaveStyle({
        backgroundColor: color,
      });
    },
  );

  it('is hidden from screen readers (the loading state announces itself once)', async () => {
    await renderWithProviders(<Skeleton testID="skeleton" />);

    expect(
      screen.getByTestId('skeleton', { includeHiddenElements: true }).props
        .importantForAccessibility,
    ).toBe('no-hide-descendants');
  });

  it('pulses slowly, and not at all when the user reduces motion', () => {
    expect(skeletonPulse(false)).toEqual({
      animate: { opacity: SKELETON_PULSE_MIN_OPACITY },
      transition: { type: 'timing', duration: SKELETON_PULSE_MS, loop: true, repeatReverse: true },
    });
    expect(skeletonPulse(true)).toEqual({
      animate: { opacity: 1 },
      transition: { type: 'timing', duration: 0 },
    });
  });
});

describe('LoadingSpinner', () => {
  it.each([
    ['light', lightColors.textSecondary],
    ['dark', darkColors.textSecondary],
  ] as const)('%s theme: the secondary text color, announced as loading', async (theme, color) => {
    await renderWithProviders(<LoadingSpinner testID="spinner" />, { themePreference: theme });

    const spinner = screen.getByLabelText('Chargement…');
    expect(spinner.props.color).toBe(color);
    expect(spinner.props.accessibilityRole).toBe('progressbar');
  });
});

describe('useDelayedFlag', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('turns true only after the delay, and false at once when inactive', async () => {
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => useDelayedFlag(active, 300),
      { initialProps: { active: true } },
    );
    expect(result.current).toBe(false);

    await act(async () => jest.advanceTimersByTime(299));
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    await rerender({ active: false });
    expect(result.current).toBe(false);

    // A new activation waits the full delay again.
    await rerender({ active: true });
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(300));
    expect(result.current).toBe(true);
  });
});
