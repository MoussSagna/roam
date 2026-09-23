import { Image } from 'expo-image';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Compass from 'lucide-react-native/icons/compass';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { getCategoryLabel } from '@/features/experiences/lib/categoryLabel';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme';

import type { ActiveJourney } from '../useActiveJourney';

const HERO_HEIGHT = 150;

type ActiveJourneyCardProps = {
  journey: ActiveJourney | null;
  onContinue: () => void;
  onDiscover: () => void;
};

/**
 * "Parcours en cours" (Profile, sprint 5 refactor): the active journey's hero, step progress and
 * next step, or an empty state with a "Découvrir" CTA when there is none — one component handles
 * both, same "branch on empty inside" convention as `FavoritesScreen`/`HistoryScreen`.
 */
export function ActiveJourneyCard({ journey, onContinue, onDiscover }: ActiveJourneyCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const categories = useCategories();

  const nextStepCategory = journey
    ? categories.find((category) => category.id === journey.nextStep.categoryId)
    : undefined;
  const nextStepCategoryLabel = nextStepCategory
    ? getCategoryLabel(t, nextStepCategory.slug)
    : null;

  return (
    <View className="gap-4 rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <Compass size={18} strokeWidth={1.8} color={colors.primary} />
        <Text variant="h4">{t('profile.journey.title')}</Text>
      </View>

      {journey ? (
        <>
          <View
            style={{ height: HERO_HEIGHT }}
            className="overflow-hidden rounded-large bg-surfaceElevated"
          >
            {journey.experience.coverImage ? (
              <Image
                source={journey.experience.coverImage}
                style={{ flex: 1 }}
                contentFit="cover"
                accessible
                accessibilityIgnoresInvertColors
                accessibilityLabel={journey.experience.title}
              />
            ) : null}
            <View className="absolute inset-x-0 bottom-0 gap-0.5 bg-overlay/40 p-3">
              <Text variant="label" className="text-white" numberOfLines={1}>
                {journey.experience.title}
              </Text>
              {journey.experience.location ? (
                <Text variant="caption" className="text-white/85" numberOfLines={1}>
                  {journey.experience.location}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="small" tone="secondary">
              {t('profile.journey.stepsProgress', {
                current: journey.currentStep,
                total: journey.totalSteps,
              })}
            </Text>
            <View className="h-1.5 overflow-hidden rounded-pill bg-border">
              <View
                className="h-full rounded-pill bg-primary"
                style={{ width: `${(journey.currentStep / journey.totalSteps) * 100}%` }}
              />
            </View>
          </View>

          <View className="gap-1">
            <Text variant="caption" tone="secondary">
              {t('profile.journey.nextStep')}
            </Text>
            <Text variant="body" className="font-bodyMedium" numberOfLines={1}>
              {journey.nextStep.title}
            </Text>
            <Text variant="small" tone="secondary">
              {[nextStepCategoryLabel, journey.nextStep.distanceLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <Button
            label={t('profile.journey.continueCta')}
            trailingIcon={ArrowRight}
            onPress={onContinue}
          />
        </>
      ) : (
        <View className="items-center gap-3 py-2">
          <Text variant="body" tone="secondary" className="text-center">
            {t('profile.journey.empty.title')}
          </Text>
          <Button label={t('profile.journey.empty.cta')} variant="secondary" onPress={onDiscover} />
        </View>
      )}
    </View>
  );
}
