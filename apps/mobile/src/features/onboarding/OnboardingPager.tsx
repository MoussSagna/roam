import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useWindowDimensions, type FlatList, type ViewToken } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import { BudgetScreen } from './BudgetScreen';
import { InterestsScreen } from './InterestsScreen';
import { LocationScreen } from './LocationScreen';
import { MoodScreen } from './MoodScreen';
import { PAGER_STEPS, type OnboardingStep, type PagerStep } from './onboardingFlow';
import {
  OnboardingPagerActionsContext,
  OnboardingPagerIndexContext,
  type OnboardingPagerActions,
} from './onboardingPagerContext';
import { TimeScreen } from './TimeScreen';

/** The existing screens, unchanged, one per slide. `memo`: a slide does not re-render when the index changes. */
const SLIDE_SCREENS: Record<PagerStep, ComponentType> = {
  mood: memo(MoodScreen),
  time: memo(TimeScreen),
  budget: memo(BudgetScreen),
  location: memo(LocationScreen),
  interests: memo(InterestsScreen),
};

/** Entering/leaving slide: subtle fade, small horizontal lag and scale, driven by the scroll position. */
const SLIDE_MIN_OPACITY = 0.35;
const SLIDE_SHIFT = 32;
const SLIDE_MIN_SCALE = 0.97;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

function isPagerStep(step: OnboardingStep): step is PagerStep {
  return (PAGER_STEPS as readonly OnboardingStep[]).includes(step);
}

type SlideProps = {
  index: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
  reduceMotion: boolean;
  active: boolean;
  children: ReactNode;
};

function Slide({ index, width, height, scrollX, reduceMotion, active, children }: SlideProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(
      scrollX.value,
      input,
      [SLIDE_MIN_OPACITY, 1, SLIDE_MIN_OPACITY],
      Extrapolation.CLAMP,
    );
    if (reduceMotion) return { opacity, transform: [] };
    return {
      opacity,
      transform: [
        {
          translateX: interpolate(
            scrollX.value,
            input,
            [SLIDE_SHIFT, 0, -SLIDE_SHIFT],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollX.value,
            input,
            [SLIDE_MIN_SCALE, 1, SLIDE_MIN_SCALE],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      testID={`onboarding-slide-${index}`}
      // Only the slide on screen is exposed to assistive technologies (its neighbors are mounted too).
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      style={[{ width, height }, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The onboarding questions (mood → interests) as fullscreen slides of one horizontal, paging `FlatList`:
 * swipe or "Suivant" moves between them. Each slide is the existing screen, unchanged. `currentIndex` is
 * the single source of truth: the swipe updates it (`onViewableItemsChanged`), "Suivant" sets it and
 * scrolls, and `ProgressBars` reads it. "Suivant" on the last slide and "Passer" keep their route
 * behavior (`useOnboardingNavigation`).
 */
export function OnboardingPager({ initialStep = 'mood' }: { initialStep?: PagerStep }) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const listRef = useRef<FlatList<PagerStep>>(null);
  const initialIndex = PAGER_STEPS.indexOf(initialStep);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const scrollX = useSharedValue(initialIndex * width);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Must keep the same identity for the list's whole life (FlatList does not support changing it).
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (index != null) setCurrentIndex(index);
    },
    [],
  );

  const actions = useMemo<OnboardingPagerActions>(
    () => ({
      goToStep: (step) => {
        if (!isPagerStep(step)) return false;
        const index = PAGER_STEPS.indexOf(step);
        setCurrentIndex(index);
        listRef.current?.scrollToIndex({ index, animated: true });
        return true;
      },
    }),
    [],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<PagerStep> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PagerStep; index: number }) => {
      const Screen = SLIDE_SCREENS[item];
      return (
        <Slide
          index={index}
          width={width}
          height={height}
          scrollX={scrollX}
          reduceMotion={reduceMotion}
          active={index === currentIndex}
        >
          <Screen />
        </Slide>
      );
    },
    [width, height, scrollX, reduceMotion, currentIndex],
  );

  return (
    <OnboardingPagerActionsContext.Provider value={actions}>
      <OnboardingPagerIndexContext.Provider value={currentIndex}>
        <Animated.FlatList
          ref={listRef}
          testID="onboarding-pager"
          data={PAGER_STEPS}
          keyExtractor={(step) => step}
          renderItem={renderItem}
          extraData={currentIndex}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          // The current slide and its neighbors: enough for a swipe, without mounting every screen.
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          style={{ flex: 1, backgroundColor: colors.background }}
        />
      </OnboardingPagerIndexContext.Provider>
    </OnboardingPagerActionsContext.Provider>
  );
}
