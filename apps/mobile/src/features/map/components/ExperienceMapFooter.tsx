import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Star from 'lucide-react-native/icons/star';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

type ExperienceMapFooterProps = {
  experience: Experience;
  /** Already-resolved "Café · Paris 3e"-style line (the screen owns the category lookup). */
  subtitle?: string | null;
  /** Small status pill above the name — a journey step's "Étape actuelle" / "Étape 2" (sprint 12). */
  badge?: string | null;
  /** `primary` pill (the current step) instead of a neutral one. */
  badgeHighlighted?: boolean;
  onPressView: (experience: Experience) => void;
};

/**
 * Bottom panel of the full-screen experience map (D-73): photo, name, category · place, rating and a
 * "Voir le lieu" CTA. A component of its own, separate from `RoamMap` — the map only draws pins; what
 * is said about the experience belongs here. Unlike `ExperienceMapCard` (a compact, dismissible
 * overlay for *picking* among many pins), this is the permanent footer of a single-experience map:
 * no close button, full-width CTA, anchored flush to the bottom edge (it pads for the home indicator).
 * The floating picker over several experiences is a later sprint, not this component.
 */
export function ExperienceMapFooter({
  experience,
  subtitle,
  badge,
  badgeHighlighted = false,
  onPressView,
}: ExperienceMapFooterProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="experience-map-footer"
      className="gap-4 rounded-t-hero border-t border-border bg-surface px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <View className="h-1 w-10 self-center rounded-pill bg-border" />

      <View className="flex-row items-center gap-4">
        <View
          style={{ width: 88, height: 88 }}
          className="overflow-hidden rounded-large bg-surfaceElevated"
        >
          {experience.coverImage ? (
            <Image
              source={experience.coverImage}
              style={{ flex: 1 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <View className="flex-1 gap-1">
          {badge ? (
            <View
              testID="experience-map-footer-badge"
              className={
                badgeHighlighted
                  ? 'flex-row items-center gap-1.5 self-start rounded-pill bg-primary/10 px-2.5 py-1'
                  : 'flex-row items-center gap-1.5 self-start rounded-pill bg-surfaceElevated px-2.5 py-1'
              }
            >
              {badgeHighlighted ? <View className="h-1.5 w-1.5 rounded-pill bg-primary" /> : null}
              <Text
                variant="caption"
                tone={badgeHighlighted ? 'primary' : 'secondary'}
                className="font-bodySemibold"
              >
                {badge}
              </Text>
            </View>
          ) : null}
          <Text variant="h4" numberOfLines={2}>
            {experience.title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {experience.rating ? (
            <View className="flex-row items-center gap-1">
              <Star size={15} strokeWidth={1.5} color={colors.warning} fill={colors.warning} />
              <Text variant="body" className="font-bodyMedium">
                {experience.rating.toFixed(1)}
              </Text>
              {experience.reviewCount ? (
                <Text variant="body" tone="secondary">
                  {t('home.reviewCount', { count: experience.reviewCount })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <Button
        label={t('map.viewPlace')}
        trailingIcon={ChevronRight}
        onPress={() => onPressView(experience)}
        className="w-full"
      />
    </View>
  );
}
