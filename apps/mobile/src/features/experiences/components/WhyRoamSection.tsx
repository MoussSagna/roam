import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { getWhyRecommended } from '../lib/whyRecommended';

type WhyRoamSectionProps = {
  experience: Experience;
};

/** "Pourquoi ROAM te le propose ?" (sprint 5 §19) — reasons derived from the experience's own data
 * (`getWhyRecommended`), not a fixed list baked into the component (`07_DATA_AND_RECOMMENDATION.md`). */
export function WhyRoamSection({ experience }: WhyRoamSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reasons = getWhyRecommended(experience);

  if (reasons.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 rounded-card border border-border bg-surface p-4">
      <Text variant="h4">{t('experience.whyRoam')}</Text>
      <View className="gap-2.5">
        {reasons.map((reason) => (
          <View key={reason} className="flex-row items-center gap-2.5">
            <View className="h-5 w-5 items-center justify-center rounded-pill bg-success/15">
              <Check size={13} strokeWidth={2.5} color={colors.success} />
            </View>
            <Text variant="body" className="flex-1">
              {t(`experience.why.${reason}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
