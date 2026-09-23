import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useExperience } from '@/features/experiences/useExperience';
import { useCategories } from '@/hooks/useCategories';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import { ExperienceMapFooter } from './components/ExperienceMapFooter';
import { RoamMap } from './components/RoamMap';
import { toMapMarkers } from './lib/markers';

type ExperienceMapScreenProps = {
  experienceId?: string;
};

/**
 * Full-screen map of one experience (`/experience-map/[id]`, D-73), opened by tapping Experience
 * detail's map block. `ExperienceMapScreen` = a header (back, name, address) + `RoamMap` filling the rest
 * + `ExperienceMapFooter` over its bottom edge. One experience, one pin, one footer — no picker, no
 * itinerary/Directions (later sprints). The route is flat (like `gallery/[id]`, D-48). The map is
 * `RoamMap` with the experience's own (mock) coordinates; back returns to the detail.
 */
export function ExperienceMapScreen({ experienceId }: ExperienceMapScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const categories = useCategories();
  const { experience, isLoading } = useExperience(experienceId);

  const markers = useMemo(() => (experience ? toMapMarkers([experience]) : []), [experience]);

  const subtitle = useMemo(() => {
    if (!experience) return null;
    const category = categories.find((item) => experience.categoryIds.includes(item.id));
    const categoryLabel = category ? getCategoryLabel(t, category.slug) : null;
    return [categoryLabel, experience.location].filter(Boolean).join(' · ') || null;
  }, [categories, experience, t]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (experienceId) {
      router.replace({ pathname: '/experience/[id]', params: { id: experienceId } });
    }
  }, [router, experienceId]);

  // The footer's CTA leads to the experience — normally the very screen this map was opened from, so
  // it goes back rather than stacking a second copy of the same detail.
  const goToExperience = goBack;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!experience || markers.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="h3" accessibilityRole="header">
          {t('common.comingSoon')}
        </Text>
        <Button label={t('common.back')} onPress={goBack} />
      </View>
    );
  }

  const footer = (
    <ExperienceMapFooter experience={experience} subtitle={subtitle} onPressView={goToExperience} />
  );

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 border-b border-border bg-background px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={goBack}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
        </Pressable>
        <View className="flex-1">
          <Text variant="h4" numberOfLines={1} accessibilityRole="header">
            {experience.title}
          </Text>
          {experience.address ? (
            <Text variant="small" tone="secondary" numberOfLines={1}>
              {experience.address}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-1">
        <RoamMap markers={markers} selectedMarkerId={experience.id} rounded={false} />

        <View className="absolute inset-x-0 bottom-0">
          {reduceMotion ? footer : <FadeInUp delay={150}>{footer}</FadeInUp>}
        </View>
      </View>
    </View>
  );
}
