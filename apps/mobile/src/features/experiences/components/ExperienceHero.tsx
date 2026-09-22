import { Image } from 'expo-image';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Heart from 'lucide-react-native/icons/heart';
import Share2 from 'lucide-react-native/icons/share-2';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui';
import type { GalleryOpenRect } from '@/types';

type ExperienceHeroProps = {
  images: readonly ImageSourcePropType[];
  title: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onBack: () => void;
  onOpenGallery: (index: number, rect: GalleryOpenRect) => void;
  topInset: number;
};

const HERO_HEIGHT_RATIO = 0.46;
const HERO_MIN_HEIGHT = 340;

/**
 * Experience detail's hero (sprint 5 §6-§9): the same full-bleed, swipeable, paginated-pager idea as
 * Home's `HeroCarousel`, but tappable — pressing the image opens the full-screen gallery (`onOpenGallery`),
 * measured so the caller can drive the hero -> gallery morph (see `ExperienceGalleryScreen`).
 */
export function ExperienceHero({
  images,
  title,
  isFavorite,
  onToggleFavorite,
  onShare,
  onBack,
  onOpenGallery,
  topInset,
}: ExperienceHeroProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const heroHeight = Math.max(HERO_MIN_HEIGHT, Math.round(height * HERO_HEIGHT_RATIO));
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
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={t('experience.gallery.counter', {
          current: activeIndex + 1,
          total: images.length,
        })}
        onPress={handlePress}
        style={{ flex: 1 }}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          testID="experience-hero-scroll"
        >
          {images.map((image, index) => (
            <View
              key={index}
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
            </View>
          ))}
        </ScrollView>
      </Pressable>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: topInset + 12,
          left: 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
        >
          <ChevronLeft size={22} strokeWidth={2} color="#FFFFFF" />
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('experience.share')}
            onPress={onShare}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
          >
            <Share2 size={19} strokeWidth={2} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? t('home.favoriteRemove') : t('home.favoriteAdd')}
            accessibilityState={{ selected: isFavorite }}
            onPress={onToggleFavorite}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
          >
            <Heart
              size={19}
              strokeWidth={2}
              color="#FFFFFF"
              fill={isFavorite ? '#FFFFFF' : 'transparent'}
            />
          </Pressable>
        </View>
      </View>

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
