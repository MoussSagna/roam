import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceholderCard, ScrollScreen, Text } from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';

const PLACEHOLDER_COUNT = 8;

/**
 * Placeholder of the discover tab (sprint 3): scrollable test ground for the floating tab bar.
 * Replace the body with the real screen when the recommendations feature is built; the route
 * (`/discover`) does not change.
 */
export function DiscoverScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarScrollHandler();

  return (
    <ScrollScreen
      testID="discover-scroll"
      onScroll={onScroll}
      contentContainerStyle={{
        paddingTop: 24,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: 16,
      }}
    >
      <Text variant="h2" accessibilityRole="header">
        {t('discover.title')}
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
