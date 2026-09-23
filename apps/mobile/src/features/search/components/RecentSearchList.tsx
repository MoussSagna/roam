import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { useTheme } from '@/theme';
import type { RecentSearch } from '@/types';

type RecentSearchListProps = {
  recentSearches: readonly RecentSearch[];
  onSelect: (query: string) => void;
  onRemove: (id: string) => void;
};

/** "Recherches récentes" (Sprint 6 brief §4/§13): each row can be tapped to relaunch that search, or
 * removed individually via its trailing "×" — mocked/local persistence (`useRecentSearches`). */
export function RecentSearchList({ recentSearches, onSelect, onRemove }: RecentSearchListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <View className="gap-3" testID="search-section-recent">
      <SectionHeader title={t('search.recent.title')} />
      <View>
        {recentSearches.map((entry) => (
          <View key={entry.id} className="flex-row items-center gap-3 py-2">
            <RotateCcw size={16} strokeWidth={1.8} color={colors.textSecondary} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entry.query}
              onPress={() => onSelect(entry.query)}
              className="flex-1"
            >
              <Text variant="body" numberOfLines={1}>
                {entry.query}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('search.recent.remove', { query: entry.query })}
              onPress={() => onRemove(entry.id)}
              hitSlop={8}
            >
              <X size={16} strokeWidth={1.8} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
