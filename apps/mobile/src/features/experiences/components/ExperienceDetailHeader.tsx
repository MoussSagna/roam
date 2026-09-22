import { BlurView } from 'expo-blur';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Heart from 'lucide-react-native/icons/heart';
import Share2 from 'lucide-react-native/icons/share-2';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export const HEADER_HEIGHT = 56;
/** Width (px) of the scroll range over which the title/background crossfade in, ending at
 * `revealOffset` — a soft transition rather than a hard cut (item 11: "apparaît progressivement"). */
const FADE_RANGE = 60;

type ExperienceDetailHeaderProps = {
  title: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onBack: () => void;
  topInset: number;
  /** Raw scroll offset (px), mutated directly from the screen's `onScroll` — same "shared value read by
   * `useAnimatedStyle`, mutated by a plain function" shape as `HomeScreen`'s hero stretch (D-46). */
  scrollY: SharedValue<number>;
  /** Scroll offset at which the title/background should be fully revealed (about where the hero ends
   * and the title sits in the content below it — see `getHeroHeight`, D-49). */
  revealOffset: number;
};

/**
 * Sticky header for the experience detail screen (polish pass, `docs/DECISIONS.md` D-49): unlike
 * Home's `HomeHeader` (which hides/shows with scroll direction), this header is always visible — only
 * its background wash and title crossfade with scroll position, independently of `HomeHeader` and the
 * global `RoamTabBar` (item 15: three independent systems). Back/share/favorite live here now (moved
 * out of `ExperienceHero`) specifically so they stay reachable while scrolled past the hero.
 *
 * Icon legibility doesn't need to track the crossfade: each button keeps its own permanent circular
 * `bg-black/25` backdrop (the same treatment `HomeHeader`'s bell and the old hero buttons already
 * used), so they read fine both over the raw photo (wash still transparent) and over the wash once it
 * fades in — no icon color interpolation needed.
 */
export function ExperienceDetailHeader({
  title,
  isFavorite,
  onToggleFavorite,
  onShare,
  onBack,
  topInset,
  scrollY,
  revealOffset,
}: ExperienceDetailHeaderProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [revealOffset - FADE_RANGE, revealOffset],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View
      testID="experience-detail-header"
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, revealStyle]}>
        <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={{ flex: 1 }} />
      </Animated.View>

      <View
        style={{
          height: HEADER_HEIGHT + topInset,
          paddingTop: topInset,
          paddingHorizontal: 16,
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

        <Animated.View
          style={[{ flex: 1, marginHorizontal: 12 }, revealStyle]}
          pointerEvents="none"
        >
          <Text variant="h4" numberOfLines={1} className="text-center">
            {title}
          </Text>
        </Animated.View>

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
    </View>
  );
}
