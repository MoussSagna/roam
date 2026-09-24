import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui';
import { CarouselDots } from '@/features/home/components/CarouselDots';
import type { GalleryOpenRect } from '@/types';

import { getHeroHeight } from '../lib/heroHeight';

/** Dots sit above the content sheet's 24 px overlap (`-mt-6`) so they stay visible. */
const DOTS_BOTTOM = 34;

type ExperienceHeroProps = {
  images: readonly ImageSourcePropType[];
  title: string;
  onOpenGallery: (index: number, rect: GalleryOpenRect) => void;
};

/**
 * Experience detail's hero: a full-bleed, swipeable, paginated pager — tapping a slide opens the
 * full-screen gallery (`onOpenGallery`), measured so the caller can drive the hero -> gallery morph
 * (see `ExperienceGalleryScreen`). Back/share/favorite moved out to `ExperienceDetailHeader` (polish
 * pass, `docs/DECISIONS.md` D-49): the hero itself no longer owns any chrome, only the photo pager.
 *
 * **Each slide is its own `Pressable`, not one `Pressable` wrapping the whole `ScrollView`.** The
 * earlier version did the latter and it silently broke swiping: a `Pressable` ancestor negotiates the
 * touch responder before its scrollable child gets a chance to claim horizontal drags. Every other
 * pressable-inside-a-horizontal-`ScrollView` in this app (e.g. `ExperienceCard` on Home) already uses
 * the working shape — `ScrollView` outermost, `Pressable` per item — so this just matches it (D-49).
 */
export function ExperienceHero({ images, title, onOpenGallery }: ExperienceHeroProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const heroHeight = getHeroHeight(height);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<View>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex((current) => (current === index ? current : index));
    },
    [width],
  );

  const handlePress = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      onOpenGallery(activeIndex, { x, y, width: measuredWidth, height: measuredHeight });
    });
  }, [activeIndex, onOpenGallery]);

  if (images.length === 0) {
    return null;
  }

  return (
    <View ref={containerRef} style={{ height: heroHeight }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID="experience-hero-scroll"
      >
        {images.map((image, index) => (
          <Pressable
            key={index}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('experience.gallery.counter', {
              current: activeIndex + 1,
              total: images.length,
            })}
            onPress={handlePress}
            style={{ width, height: heroHeight }}
            accessibilityElementsHidden={index !== activeIndex}
            importantForAccessibility={index !== activeIndex ? 'no-hide-descendants' : 'auto'}
          >
            <Image
              source={image}
              style={{ flex: 1 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel={title}
            />
          </Pressable>
        ))}
      </ScrollView>

      {images.length > 1 ? (
        // Pagination dots (D-73): `CarouselDots` reused from Home's hero, driven by the same
        // `activeIndex` as the counter. Raised above the counter's baseline so they aren't tucked
        // under the content sheet that overlaps the hero's bottom edge (`-mt-6` in the screen).
        <View
          pointerEvents="none"
          testID="experience-hero-dots"
          style={{ position: 'absolute', bottom: DOTS_BOTTOM, left: 20 }}
        >
          <CarouselDots count={images.length} activeIndex={activeIndex} />
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 16, right: 16 }}
        className="rounded-pill bg-black/40 px-3 py-1"
      >
        <Text variant="small" className="text-white">
          {t('experience.gallery.counter', { current: activeIndex + 1, total: images.length })}
        </Text>
      </View>
    </View>
  );
}
