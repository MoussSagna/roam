import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Info from 'lucide-react-native/icons/info';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  IconButton,
  STICKY_REVEAL_HEADER_HEIGHT,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useExperience } from '@/features/experiences/useExperience';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';
import { useCategories } from '@/hooks/useCategories';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { brand } from '@/theme/palette';
import type { Experience } from '@/types';

import { ExperienceMapFooter } from './components/ExperienceMapFooter';
import { RoamMap } from './components/RoamMap';
import { isPinnable, toMapMarkers } from './lib/markers';

/** `StickyRevealHeader` reveals its background past this scroll offset. This screen never scrolls, so
 * the offset is unreachable and the header stays transparent over the map, as intended. */
const NEVER_REVEAL_OFFSET = 10_000;
/** Slide distance until the footer has been measured. */
const FOOTER_FALLBACK_HEIGHT = 320;
const SLIDE_MS = 240;

type ExperienceMapScreenProps = {
  experienceId?: string;
};

/**
 * Full-screen map of one experience (`/experience-map/[id]`, D-73, D-74), opened by tapping Experience
 * detail's map block. The map (`RoamMap`) fills the whole screen; a **transparent**
 * `StickyRevealHeader` (back button only, no title, no background) floats over it, and `ExperienceMapFooter` sits over
 * the bottom edge. **Tapping bare map slides the footer down** (`translateY`, Moti), leaving the map
 * fully visible with one small "info" button to slide it back up; taps on the marker or on the footer
 * itself don't count — `react-native-maps` only reports `onPress` for empty map, and pan/zoom are
 * untouched.
 *
 * **Several experiences (sprint 9):** the whole pinnable pool is drawn as round photo markers
 * (`ExperienceMarker`). One state, `selectedExperienceId` (the opened experience at first), drives the
 * selected marker *and* the footer: tapping a marker selects it, shows the footer if it was hidden,
 * and `RoamMap` (`focusInsets`) glides the camera so the marker sits centered between the header and
 * the footer.
 */
export function ExperienceMapScreen({ experienceId }: ExperienceMapScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const categories = useCategories();
  const { experience, isLoading } = useExperience(experienceId);
  const { experiences: pool, isLoading: isPoolLoading } = useHomeExperiences();
  const [selectedExperienceId, setSelectedExperienceId] = useState(experienceId ?? null);
  const scrollY = useSharedValue(0);
  const [footerVisible, setFooterVisible] = useState(true);
  const [footerHeight, setFooterHeight] = useState(FOOTER_FALLBACK_HEIGHT);

  // The opened experience plus the rest of the pool, pinnable ones only (the opened one is always in).
  const mapExperiences = useMemo(() => {
    if (!experience) return [];
    const all = pool.some((item) => item.id === experience.id) ? pool : [experience, ...pool];
    return all.filter(isPinnable);
  }, [experience, pool]);
  const markers = useMemo(() => toMapMarkers(mapExperiences), [mapExperiences]);
  const selectedExperience =
    mapExperiences.find((item) => item.id === selectedExperienceId) ?? experience;

  const subtitle = useMemo(() => {
    if (!selectedExperience) return null;
    const category = categories.find((item) => selectedExperience.categoryIds.includes(item.id));
    const categoryLabel = category ? getCategoryLabel(t, category.slug) : null;
    return [categoryLabel, selectedExperience.location].filter(Boolean).join(' · ') || null;
  }, [categories, selectedExperience, t]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (experienceId) {
      router.replace({ pathname: '/experience/[id]', params: { id: experienceId } });
    }
  }, [router, experienceId]);

  // The footer's CTA leads to the selected experience. For the opened one that is normally the very
  // screen this map was opened from, so it goes back rather than stacking a second copy of it.
  const goToExperience = useCallback(
    (target: Experience) => {
      if (target.id === experienceId) {
        goBack();
      } else {
        router.push({ pathname: '/experience/[id]', params: { id: target.id } });
      }
    },
    [goBack, router, experienceId],
  );

  // A marker tap selects its experience (never deselects: the footer always has one to show) and
  // brings the footer back if a bare-map tap had hidden it.
  const selectExperience = useCallback((id: string) => {
    setSelectedExperienceId(id);
    setFooterVisible(true);
  }, []);

  // Recentering keeps the selected marker clear of the transparent header and of the footer.
  const focusInsets = useMemo(
    () => ({ top: STICKY_REVEAL_HEADER_HEIGHT + insets.top, bottom: footerHeight }),
    [insets.top, footerHeight],
  );

  const hideFooter = useCallback(() => setFooterVisible(false), []);
  const showFooter = useCallback(() => setFooterVisible(true), []);
  const handleFooterLayout = useCallback(
    (event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height),
    [],
  );

  if (isLoading || isPoolLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!experience || !selectedExperience || !isPinnable(experience)) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="h3" accessibilityRole="header">
          {t('common.comingSoon')}
        </Text>
        <Button label={t('common.back')} onPress={goBack} />
      </View>
    );
  }

  const duration = reduceMotion ? 0 : SLIDE_MS;

  return (
    <View className="flex-1 bg-background">
      <RoamMap
        markers={markers}
        selectedMarkerId={selectedExperience.id}
        onPressMarker={selectExperience}
        onPressMap={hideFooter}
        focusInsets={focusInsets}
        rounded={false}
        style={StyleSheet.absoluteFill}
      />

      <StickyRevealHeader
        scrollY={scrollY}
        revealOffset={NEVER_REVEAL_OFFSET}
        leftSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={goBack}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
          >
            <ChevronLeft size={22} strokeWidth={2} color={brand.white} />
          </Pressable>
        }
      />

      <MotiView
        testID="experience-map-footer-slot"
        from={{ translateY: footerHeight }}
        animate={{ translateY: footerVisible ? 0 : footerHeight }}
        transition={{ type: 'timing', duration }}
        onLayout={handleFooterLayout}
        pointerEvents={footerVisible ? 'auto' : 'none'}
        accessibilityElementsHidden={!footerVisible}
        importantForAccessibility={footerVisible ? 'auto' : 'no-hide-descendants'}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <ExperienceMapFooter
          experience={selectedExperience}
          subtitle={subtitle}
          onPressView={goToExperience}
        />
      </MotiView>

      {!footerVisible ? (
        <MotiView
          from={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration, delay: reduceMotion ? 0 : 120 }}
          style={{ position: 'absolute', right: 16, bottom: insets.bottom + 16 }}
        >
          <IconButton
            icon={Info}
            accessibilityLabel={t('map.showInfo')}
            onPress={showFooter}
            size={48}
          />
        </MotiView>
      ) : null}
    </View>
  );
}
