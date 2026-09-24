import ChevronRight from 'lucide-react-native/icons/chevron-right';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type ActivitySummaryCardProps = {
  outings: number;
  placesDiscovered: number;
  onPress: () => void;
};

/**
 * "Mon activité cette année" (Profile, sprint 5 refactor): a compact, pressable summary leading to
 * "Mes statistiques" — reuses the same `UserStats` numbers `ProfileStats` already shows at the top
 * of the screen, just a different presentation (a year-framed teaser, not the at-a-glance row).
 */
export function ActivitySummaryCard({
  outings,
  placesDiscovered,
  onPress,
}: ActivitySummaryCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('profile.activity.title')}
      onPress={onPress}
      className="gap-4 rounded-card border border-border bg-surface p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={18} strokeWidth={1.8} color={colors.primary} />
          <Text variant="h4">{t('profile.activity.title')}</Text>
        </View>
        <ChevronRight size={18} strokeWidth={1.8} color={colors.textSecondary} />
      </View>

      <View className="flex-row gap-8">
        <View className="gap-1">
          <Text variant="h3">{outings}</Text>
          <Text variant="caption" tone="secondary">
            {t('profile.activity.outingsThisYear')}
          </Text>
        </View>
        <View className="gap-1">
          <Text variant="h3">{placesDiscovered}</Text>
          <Text variant="caption" tone="secondary">
            {t('profile.placesDiscovered')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
