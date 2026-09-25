import ArrowRight from 'lucide-react-native/icons/arrow-right';
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  useWindowDimensions,
  View,
  type FlatList,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import { BudgetScreen } from './BudgetScreen';
import { ProgressBars } from './components/ProgressBars';
import { InterestsScreen } from './InterestsScreen';
import { LocationScreen } from './LocationScreen';
import { MoodScreen } from './MoodScreen';
import {
  EMPTY_ANSWERS,
  isStepComplete,
  lastReachableIndex,
  type OnboardingAnswers,
} from './onboardingAnswers';
import { PAGER_STEPS, useOnboardingNavigation, type PagerStep } from './onboardingFlow';
import type { SingleChoiceSlideProps } from './slideProps';
import { TimeScreen } from './TimeScreen';

type SingleChoiceStep = Exclude<PagerStep, 'interests'>;

const SINGLE_CHOICE_STEPS: readonly SingleChoiceStep[] = ['mood', 'time', 'budget', 'location'];

/** The existing screens, one per slide. `memo`: a slide re-renders only when its own answer changes. */
const SINGLE_CHOICE_SLIDES: Record<SingleChoiceStep, ComponentType<SingleChoiceSlideProps>> = {
  mood: memo(MoodScreen),
  time: memo(TimeScreen),
  budget: memo(BudgetScreen),
  location: memo(LocationScreen),
};
const InterestsSlide = memo(InterestsScreen);

/** Entering/leaving slide: subtle fade, small horizontal lag and scale, driven by the scroll position. */
const SLIDE_MIN_OPACITY = 0.35;
const SLIDE_SHIFT = 32;
const SLIDE_MIN_SCALE = 0.97;

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

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
 * The onboarding questions (mood → interests) in three zones: a fixed header ("Passer", once), a horizontal
 * paging `FlatList` of the question slides in between, and a fixed footer (animated progress bars, then
 * "Suivant"). Only the middle changes from one slide to the next.
 *
 * - `currentIndex` is the single index: the swipe updates it (`onViewableItemsChanged`), "Suivant" sets it
 *   and scrolls, the bars show it.
 * - `canGoNext` (`isStepComplete` on the current question) is the single rule for moving on: it disables
 *   "Suivant", and the list only holds the slides up to the first unanswered question, so a swipe cannot
 *   go past it (going back stays possible).
 * - "Suivant" on the last question opens the profile creation; "Passer" is never blocked.
 */
export function OnboardingPager() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const { skip } = useOnboardingNavigation('mood');
  const { next: openProfileCreation } = useOnboardingNavigation('interests');
  const listRef = useRef<FlatList<PagerStep>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  /** Height of the middle zone (between header and footer): every slide fills it. */
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  const canGoNext = isStepComplete(PAGER_STEPS[currentIndex], answers);
  const reachableCount = lastReachableIndex(answers) + 1;
  // Nothing until the middle zone is measured, so no slide is ever laid out at a wrong height.
  const slides = useMemo(
    () => (pageHeight === null ? [] : PAGER_STEPS.slice(0, reachableCount)),
    [pageHeight, reachableCount],
  );

  const scrollX = useSharedValue(0);
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

  const onSelect = useMemo(
    () =>
      Object.fromEntries(
        SINGLE_CHOICE_STEPS.map((step) => [
          step,
          (id: string) => setAnswers((current) => ({ ...current, [step]: id })),
        ]),
      ) as Record<SingleChoiceStep, (id: string) => void>,
    [],
  );
  const onToggleInterest = useCallback(
    (id: string) =>
      setAnswers((current) => {
        const interests = new Set(current.interests);
        if (!interests.delete(id)) interests.add(id);
        return { ...current, interests };
      }),
    [],
  );

  const goNext = () => {
    if (!canGoNext) return;
    if (currentIndex === PAGER_STEPS.length - 1) {
      openProfileCreation();
      return;
    }
    const index = currentIndex + 1;
    setCurrentIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const onBodyLayout = useCallback((event: LayoutChangeEvent) => {
    setPageHeight(event.nativeEvent.layout.height);
  }, []);

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
      let content: ReactNode;
      if (item === 'interests') {
        content = <InterestsSlide selected={answers.interests} onToggle={onToggleInterest} />;
      } else {
        const Screen = SINGLE_CHOICE_SLIDES[item];
        content = <Screen selected={answers[item]} onSelect={onSelect[item]} />;
      }
      return (
        <Slide
          index={index}
          width={width}
          height={pageHeight ?? 0}
          scrollX={scrollX}
          reduceMotion={reduceMotion}
          active={index === currentIndex}
        >
          {content}
        </Slide>
      );
    },
    [answers, onSelect, onToggleInterest, width, pageHeight, scrollX, reduceMotion, currentIndex],
  );

  return (
    <View className="flex-1 bg-background">
      <View testID="onboarding-header" style={{ paddingTop: insets.top }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.skip')}
          onPress={skip}
          hitSlop={12}
          className="self-end active:opacity-60"
          style={{ marginRight: 26, marginTop: 17 }}
        >
          <Text variant="small" tone="secondary">
            {t('common.skip')}
          </Text>
        </Pressable>
      </View>

      <Animated.FlatList
        ref={listRef}
        testID="onboarding-pager"
        data={slides}
        keyExtractor={(step) => step}
        renderItem={renderItem}
        extraData={currentIndex}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={onBodyLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        getItemLayout={getItemLayout}
        // The current slide and its neighbors: enough for a swipe, without mounting every screen.
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        style={{ flex: 1, backgroundColor: colors.background }}
      />

      <View
        testID="onboarding-footer"
        style={{ paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 20 }}
      >
        <ProgressBars count={PAGER_STEPS.length} index={currentIndex} animated />
        <Button
          label={t('common.next')}
          trailingIcon={ArrowRight}
          onPress={goNext}
          disabled={!canGoNext}
          className="mt-[21px]"
        />
      </View>
    </View>
  );
}
