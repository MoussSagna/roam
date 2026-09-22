import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { BackHandler, FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { GalleryOpenRect } from '@/types';

import { GalleryThumbnail, THUMB_GAP, THUMB_SIZE } from './components/GalleryThumbnail';
import { useExperience } from '../useExperience';

const MORPH_OPEN_DURATION = 320;
const MORPH_CLOSE_DURATION = 260;

type ExperienceGalleryScreenProps = {
  experienceId?: string;
  initialIndex?: number;
  /** The hero's on-screen rect when the user tapped it, used to morph into fullscreen (sprint 5
   * §13-§15) instead of a hard cut. `undefined` when the route was reached without it (deep link,
   * tests): the screen just fades in as an ordinary full-screen gallery. */
  originRect?: GalleryOpenRect;
};

/**
 * Full-screen gallery (sprint 5 §10-§11): a paging main `FlatList` (one photo per page) synced with a
 * thumbnail-strip `FlatList` below it, plus a close button and a live "n / total" counter. See
 * `docs/DECISIONS.md` D-48 for the hero -> gallery transition strategy (no shared-element library in
 * the stack — a Reanimated rect morph is the documented fallback for that exact case).
 */
export function ExperienceGalleryScreen({
  experienceId,
  initialIndex = 0,
  originRect,
}: ExperienceGalleryScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { experience } = useExperience(experienceId);

  const images = experience?.images ?? (experience?.coverImage ? [experience.coverImage] : []);
  const canMorph = !!originRect && !reduceMotion;

  // Not clamped against `images.length` here: `experience` (and so `images`) is still empty on the
  // very first render (it loads asynchronously), and a `useState` initializer only runs once — trust
  // the caller instead (`initialIndex` always comes from a screen that already knows the image count).
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [overlayVisible, setOverlayVisible] = useState(canMorph);
  const mainListRef = useRef<FlatList<ImageSourcePropType>>(null);
  const thumbListRef = useRef<FlatList<ImageSourcePropType>>(null);
  const progress = useSharedValue(canMorph ? 0 : 1);

  // Both plain functions (not `useCallback`), declared before any `useEffect` that mutates the same
  // shared value: mutating a Reanimated shared value from inside a memoized callback, or after an
  // effect that also touches it, trips `eslint-plugin-react-hooks`'s immutability check — the same
  // "plain function, not memoized" pattern `HomeScreen`'s `onScroll` uses (`docs/DECISIONS.md` D-46).
  function playOpenAnimation() {
    progress.value = withTiming(1, { duration: MORPH_OPEN_DURATION }, (finished) => {
      if (finished) runOnJS(setOverlayVisible)(false);
    });
  }

  function handleClose() {
    if (canMorph) {
      setOverlayVisible(true);
      progress.value = withTiming(0, { duration: MORPH_CLOSE_DURATION }, (finished) => {
        if (finished) runOnJS(router.back)();
      });
    } else {
      router.back();
    }
  }

  useEffect(() => {
    if (canMorph) playOpenAnimation();
    // Runs once, on mount, to play the entrance exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kept current every render (inside an effect, not during render) so the back-handler subscription
  // below can stay mounted once while still calling the latest `handleClose` closure.
  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const overlayStyle = useAnimatedStyle(() => {
    if (!originRect) {
      return { opacity: 0 };
    }
    return {
      position: 'absolute',
      top: interpolate(progress.value, [0, 1], [originRect.y, 0], Extrapolation.CLAMP),
      left: interpolate(progress.value, [0, 1], [originRect.x, 0], Extrapolation.CLAMP),
      width: interpolate(
        progress.value,
        [0, 1],
        [originRect.width, screenWidth],
        Extrapolation.CLAMP,
      ),
      height: interpolate(
        progress.value,
        [0, 1],
        [originRect.height, screenHeight],
        Extrapolation.CLAMP,
      ),
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: canMorph ? progress.value : 1,
  }));

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
      setActiveIndex((current) => (current === index ? current : index));
    },
    [screenWidth],
  );

  useEffect(() => {
    try {
      thumbListRef.current?.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    } catch {
      // Still settling its own layout right after mount — next index change will retry.
    }
  }, [activeIndex]);

  const handleThumbnailPress = useCallback((index: number) => {
    setActiveIndex(index);
    mainListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  if (!experience || images.length === 0) {
    return (
      <View
        style={{ flex: 1, backgroundColor: '#000000' }}
        className="items-center justify-center gap-4 px-6"
      >
        <Text variant="body" className="text-white">
          {t('common.comingSoon')}
        </Text>
        <Button label={t('common.close')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />

      <Animated.View style={[{ flex: 1 }, contentStyle]}>
        <FlatList
          ref={mainListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `image-${index}`}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          initialScrollIndex={activeIndex}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          testID="gallery-main-list"
          renderItem={({ item }) => (
            <View style={{ width: screenWidth, height: screenHeight }}>
              <Image
                source={item}
                style={{ flex: 1 }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            </View>
          )}
        />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={handleClose}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-black/40 active:opacity-80"
          >
            <X size={20} strokeWidth={2} color="#FFFFFF" />
          </Pressable>
          <View className="rounded-pill bg-black/40 px-3 py-1.5">
            <Text variant="small" className="text-white">
              {t('experience.gallery.counter', { current: activeIndex + 1, total: images.length })}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0 }}
        >
          <FlatList
            ref={thumbListRef}
            data={images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `thumb-${index}`}
            getItemLayout={(_, index) => ({
              length: THUMB_SIZE + THUMB_GAP,
              offset: (THUMB_SIZE + THUMB_GAP) * index,
              index,
            })}
            initialScrollIndex={activeIndex}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            testID="gallery-thumbnail-list"
            renderItem={({ item, index }) => (
              <GalleryThumbnail
                source={item}
                index={index}
                active={index === activeIndex}
                label={t('experience.gallery.counter', {
                  current: index + 1,
                  total: images.length,
                })}
                onPress={handleThumbnailPress}
              />
            )}
          />
        </View>
      </Animated.View>

      {overlayVisible && originRect ? (
        <Animated.View style={overlayStyle} pointerEvents="none">
          <Animated.Image source={images[activeIndex]} style={{ flex: 1 }} resizeMode="cover" />
        </Animated.View>
      ) : null}
    </View>
  );
}
