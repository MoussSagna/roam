import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceholderCard, ScrollScreen, Text } from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';

const PLACEHOLDER_COUNT = 8;

/**
 * Placeholder of the favorites tab (sprint 3): scrollable test ground for the floating tab bar.
 * Replace the body with the real empty/list states when the favorites feature is built; the route
 * (`/favorites`) does not change.
 */
export function FavoritesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarScrollHandler();

  return (
    <ScrollScreen
      testID="favorites-scroll"
      onScroll={onScroll}
      contentContainerStyle={{
        paddingTop: 24,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: 16,
      }}
    >
      <Text variant="h2" accessibilityRole="header">
        {t('favorites.title')}
      </Text>
      <Text variant="body" tone="secondary">
        {t('common.comingSoon')}
      </Text>
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <PlaceholderCard key={index} index={index + 1} />
      ))}
    </ScrollScreen>
  );
}
