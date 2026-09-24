import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { UserStats } from '@/types';

type ProfileStatsProps = {
  stats: UserStats;
};

/** The three summary counters under the header (mockup tile 01: Sorties, Lieux découverts, Favoris). */
export function ProfileStats({ stats }: ProfileStatsProps) {
  const { t } = useTranslation();

  const items: { label: string; value: number }[] = [
    { label: t('profile.stats.outings'), value: stats.outings },
    { label: t('profile.placesDiscovered'), value: stats.placesDiscovered },
    { label: t('profile.stats.favorites'), value: stats.favorites },
  ];

  return (
    <View className="flex-row rounded-card border border-border bg-surface py-4">
      {items.map((item, index) => (
        <View
          key={item.label}
          className={
            index > 0
              ? 'flex-1 items-center gap-1 border-l border-border'
              : 'flex-1 items-center gap-1'
          }
        >
          <Text variant="h3">{item.value}</Text>
          <Text variant="caption" tone="secondary">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
