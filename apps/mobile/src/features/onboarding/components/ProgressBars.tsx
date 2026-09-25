import { View } from 'react-native';

import { cx } from '@/lib/cx';

import { useOnboardingPagerIndex } from '../onboardingPagerContext';

type ProgressBarsProps = {
  count: number;
  /** 0-based index of the current step (inside the question pager, its `currentIndex` wins). */
  index: number;
};

/**
 * Segmented progress bars shown under the onboarding questions (mood → interests). Inside the question
 * pager the bars follow its `currentIndex` (one slide per question, same order), so they always show
 * the slide actually on screen.
 */
export function ProgressBars({ count, index: fallbackIndex }: ProgressBarsProps) {
  const index = useOnboardingPagerIndex() ?? fallbackIndex;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      className="flex-row items-center justify-center gap-[6px]"
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className={cx(
            'h-[6px] rounded-pill',
            i === index ? 'w-[18px] bg-primary' : 'w-[14px] bg-text/[0.17]',
          )}
        />
      ))}
    </View>
  );
}
