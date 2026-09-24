import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Heart from 'lucide-react-native/icons/heart';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  FadeInUp,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { FavoriteExperienceRow } from './components/FavoriteExperienceRow';
import { useFavoriteExperiences } from './useFavoriteExperiences';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as Preferences' own `revealOffset` (`docs/DECISIONS.md` D-49/D-56). */
const HEADER_REVEAL_OFFSET = 70;
const STAGGER_STEP_MS = 60;
const MAX_STAGGER_MS = 240;

/**
 * "Mes favoris" (profile, écran 3): favorited experiences, one row per item, with a header that
 * crossfades in a background/title past `HEADER_REVEAL_OFFSET` (`StickyRevealHeader`, D-55/D-56 — same
 * restructure Preferences used: a plain in-content `h2` stands in for the header's own title until the
 * header reveals). Backed entirely by `Experience.isFavorite` (`useFavoriteExperiences`) — there is no
 * separate place-favoriting system yet, so the mockup's "Lieux"/"Expériences" segmented control was not
 * reproduced; see `docs/DECISIONS.md` for the reasoning. No backend: removing a favorite here is local
 * state only, like every other mocked interaction in this sprint.
 */
export function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const categories = useCategories();
  const { favorites, isLoading, removeFavorite } = useFavoriteExperiences();

  // Not `useCallback`, same reason as `PreferencesScreen`'s own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  const categoryLabelFor = useCallback(
    (experience: Experience) => {
      const category = categories.find((item) => experience.categoryIds.includes(item.id));
      return category ? getCategoryLabel(t, category.slug) : null;
    },
    [categories, t],
  );

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  const goToDiscover = useCallback(() => {
    router.push('/discover');
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="favorites-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + 32,
          gap: 4,
        }}
      >
        <Text variant="h2" accessibilityRole="header" className="pb-4">
          {t('favorites.title')}
        </Text>

        {isLoading ? (
          <Text variant="body" tone="secondary" className="pt-16 text-center">
            {t('common.loading')}
          </Text>
        ) : favorites.length === 0 ? (
          <View className="items-center gap-4 pt-16">
            <View className="h-16 w-16 items-center justify-center rounded-pill bg-surfaceElevated">
              <Heart size={26} strokeWidth={1.5} color={colors.textSecondary} />
            </View>
            <Text variant="body" tone="secondary" className="text-center">
              {t('favorites.empty')}
            </Text>
            <Button label={t('favorites.discover')} onPress={goToDiscover} />
          </View>
        ) : (
          favorites.map((experience, index) => (
            <FadeInUp key={experience.id} delay={Math.min(index * STAGGER_STEP_MS, MAX_STAGGER_MS)}>
              <FavoriteExperienceRow
                experience={experience}
                categoryLabel={categoryLabelFor(experience)}
                onPress={goToExperience}
                onRemove={removeFavorite}
              />
            </FadeInUp>
          ))
        )}
      </ScrollScreen>

      <StickyRevealHeader
        title={t('favorites.title')}
        scrollY={scrollY}
        revealOffset={HEADER_REVEAL_OFFSET}
        leftSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
          </Pressable>
        }
      />
    </View>
  );
}
