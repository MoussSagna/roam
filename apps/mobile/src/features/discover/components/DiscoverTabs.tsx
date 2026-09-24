import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';

import { Chip } from '@/components/ui';

import { DISCOVER_TABS, type DiscoverTab, type DiscoverTabId } from '../data/discoverTabs';

type DiscoverTabsProps = {
  selected: DiscoverTabId;
  onSelect: (id: DiscoverTabId) => void;
};

/**
 * Secondary navigation ("Pour toi / Tendances / À proximité / Collections", sprint 6 brief). A
 * `FlatList`, not a `ScrollView` (this sprint's carousel rule, `docs/DEVELOPMENT.md` ->
 * "Horizontal lists / carousels"): a small, fixed set today, but the same list shape a future
 * server-driven tab set would use.
 */
export function DiscoverTabs({ selected, onSelect }: DiscoverTabsProps) {
  const { t } = useTranslation();

  return (
    <FlatList
      horizontal
      data={DISCOVER_TABS}
      keyExtractor={(tab) => tab.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 24 }}
      renderItem={({ item }: { item: DiscoverTab }) => (
        <Chip
          label={t(item.labelKey)}
          selected={item.id === selected}
          onPress={() => onSelect(item.id)}
        />
      )}
    />
  );
}
