import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceholderCard, ScrollScreen, Text } from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';

const PLACEHOLDER_COUNT = 8;

/**
 * Placeholder of the home screen (03 in `03_UX_SCREENS_AND_FLOWS.md`), the end of the onboarding.
 * Scrollable test ground for the floating tab bar (sprint 3); replace the body with the real screen
 * when the recommendations feature is built — the route (`/home`) does not change.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarScrollHandler();

  return (
    <ScrollScreen
      testID="home-scroll"
      onScroll={onScroll}
      contentContainerStyle={{
        paddingTop: 24,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: 16,
      }}
    >
      <Text variant="h2" accessibilityRole="header">
        {t('home.title')}
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
