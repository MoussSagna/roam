import { MotiView } from 'moti';
import { View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';

type CarouselDotsProps = {
  count: number;
  activeIndex: number;
  /** Dot color; the hero sits on a photo so dots are drawn in a fixed light tone, not a theme token. */
  color?: string;
};

const DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 18;

/**
 * Hero carousel pagination (`● ○ ○ ○ ○`, sprint 5 §5). New component, not the deleted `PageDots`
 * (`docs/DECISIONS.md` D-28) — that one was removed from the onboarding Welcome screen specifically
 * and the brief here explicitly asks for dots on the Home hero, a different, unrelated screen.
 */
export function CarouselDots({ count, activeIndex, color = '#FFFFFF' }: CarouselDotsProps) {
  const reduceMotion = useReduceMotion();

  return (
    <View
      className="flex-row items-center gap-1.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex;
        return (
          <MotiView
            key={index}
            animate={{ width: isActive ? ACTIVE_DOT_WIDTH : DOT_SIZE, opacity: isActive ? 1 : 0.5 }}
            transition={{ type: 'timing', duration: reduceMotion ? 0 : 220 }}
            style={{
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}
