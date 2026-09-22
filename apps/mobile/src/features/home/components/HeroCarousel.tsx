import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MapPin from 'lucide-react-native/icons/map-pin';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { CarouselDots } from './CarouselDots';

type HeroCarouselProps = {
  experiences: readonly Experience[];
  onPressExperience: (experience: Experience) => void;
  /** Positions the location badge clear of the status bar/notch; the notification bell now lives in
   * `HomeHeader`, a separate floating element (sprint 4 polish §6). */
  topInset: number;
};

const HERO_HEIGHT_RATIO = 0.56;
const HERO_MIN_HEIGHT = 420;

/**
 * Home's hero — the "sortie du moment" carousel (sprint 5 §4-§5): full-bleed, swipeable, paginated
 * with dots. Slides are plain paging `ScrollView` pages (no new dependency): position is tracked from
 * `onScroll` like the tab bar's own scroll handler (`TabBarCollapseContext`), not a gesture library.
 */
export function HeroCarousel({ experiences, onPressExperience, topInset }: HeroCarouselProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const heroHeight = Math.max(HERO_MIN_HEIGHT, Math.round(height * HERO_HEIGHT_RATIO));
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex((current) => (current === index ? current : index));
    },
    [width],
  );

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(experiences.length - 1, index));
      scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
      setActiveIndex(clamped);
    },
    [experiences.length, width],
  );

  const active = experiences[activeIndex];

  if (experiences.length === 0) {
    return null;
  }

  return (
    <View style={{ height: heroHeight }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="hero-carousel-scroll"
      >
        {experiences.map((experience, index) => (
          <View
            key={experience.id}
            style={{ width, height: heroHeight }}
            accessibilityElementsHidden={index !== activeIndex}
            importantForAccessibility={index !== activeIndex ? 'no-hide-descendants' : 'auto'}
          >
            {experience.coverImage ? (
              <Image
                source={experience.coverImage}
                style={{ flex: 1 }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
                accessible
                accessibilityLabel={experience.title}
              />
            ) : (
              <View style={{ flex: 1 }} className="bg-surfaceElevated" />
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.78)']}
              locations={[0, 0.5, 1]}
              style={{ position: 'absolute', inset: 0 }}
            />

            <View className="absolute inset-x-0 bottom-0 gap-3 px-6 pb-24">
              <Text
                variant="caption"
                className="font-bodySemibold uppercase tracking-widest text-white/80"
              >
                {t('home.hero.eyebrow')}
              </Text>
              <Text
                variant="h1"
                className="text-white"
                numberOfLines={2}
                accessibilityRole="header"
              >
                {experience.title}
              </Text>
              <Text variant="body" className="text-white/90" numberOfLines={2}>
                {experience.description}
              </Text>
              <View className="flex-row items-center gap-2">
                {[experience.durationLabel, experience.priceLabel, experience.location]
                  .filter(Boolean)
                  .map((item, index, all) => (
                    <View key={`${experience.id}-${index}`} className="flex-row items-center gap-2">
                      <Text variant="small" className="text-white/90">
                        {item}
                      </Text>
                      {index < all.length - 1 ? (
                        <View className="h-1 w-1 rounded-pill bg-white/60" />
                      ) : null}
                    </View>
                  ))}
              </View>
              {/*
                Dark mode: `secondary` (bg-surface, near-black in dark) would read as a near-invisible
                CTA against the already-dark gradient overlay. `primary` reuses the same token pair
                every other primary button already relies on (`primary`/`primaryForeground`, AA
                contrast covered by `theme.test.ts`) instead of a one-off hardcoded color — light
                mode is untouched (sprint 4 polish §1).
              */}
              <Button
                label={t('experience.viewExperience')}
                variant={isDark ? 'primary' : 'secondary'}
                onPress={() => onPressExperience(experience)}
                className="mt-2 min-h-14 self-start px-6"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {active?.location ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: topInset + 12, left: 24 }}
          className="flex-row items-center gap-1 rounded-pill bg-black/30 px-3 py-1.5"
        >
          <MapPin size={14} strokeWidth={1.8} color="#FFFFFF" />
          <Text variant="small" className="text-white">
            {active.location}
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: 16, left: 24, right: 24 }}
        className="flex-row items-center justify-between"
      >
        <CarouselDots count={experiences.length} activeIndex={activeIndex} />

        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            disabled={activeIndex === 0}
            onPress={() => goTo(activeIndex - 1)}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-pill bg-black/25 active:opacity-80 disabled:opacity-40"
          >
            <ChevronLeft size={18} strokeWidth={2} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.next')}
            disabled={activeIndex === experiences.length - 1}
            onPress={() => goTo(activeIndex + 1)}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-pill bg-black/25 active:opacity-80 disabled:opacity-40"
          >
            <ChevronRight size={18} strokeWidth={2} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
