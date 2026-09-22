import { useRouter } from 'expo-router';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import Clock from 'lucide-react-native/icons/clock';
import Globe from 'lucide-react-native/icons/globe';
import Heart from 'lucide-react-native/icons/heart';
import LogOut from 'lucide-react-native/icons/log-out';
import Settings from 'lucide-react-native/icons/settings';
import Shield from 'lucide-react-native/icons/shield';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import SunMoon from 'lucide-react-native/icons/sun-moon';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { FadeInUp, IconButton, ScrollScreen, Text } from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/features/navigation/tabBarConfig';
import { useTabBarScrollHandler } from '@/features/navigation/TabBarCollapseContext';
import { isLanguage, type Language } from '@/i18n';
import { useTheme, type ThemePreference } from '@/theme';

import { ProfileHeader } from './components/ProfileHeader';
import { ProfileMenuRow } from './components/ProfileMenuRow';
import { ProfileStats } from './components/ProfileStats';
import { useCurrentUser } from './useCurrentUser';

const DEFAULT_STATS = { outings: 0, placesDiscovered: 0, favorites: 0 };

/** Explicit maps so each value stays a typed, checked i18n key, not a dynamic template literal
 * (`react-i18next`'s typed keys reject those — same pattern as `categoryLabel.ts`). */
const LANGUAGE_LABEL_KEYS = {
  fr: 'settings.languages.fr',
  en: 'settings.languages.en',
} as const satisfies Record<Language, string>;

const THEME_LABEL_KEYS = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  system: 'settings.theme.system',
} as const satisfies Record<ThemePreference, string>;

/**
 * Real profile screen (sprint 5, écran 1): header (avatar, name, bio, edit CTA), stats, and the
 * menu grouped exactly like the mockup — discovery (préférences/favoris/historique/statistiques),
 * settings (langue/thème) and support (aide/confidentialité) — then logout. Every row not built yet
 * this sprint pushes to a `ProfilePlaceholder` route (`docs/SCREEN_INTEGRATION_WORKFLOW.md` §7); its
 * body, not its route, gets replaced when that screen's own session comes.
 */
export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { logout } = useAuth();
  const { preference: themePreference } = useTheme();
  const insets = useSafeAreaInsets();
  const onScroll = useTabBarScrollHandler();
  const { user } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const language: Language = isLanguage(i18n.language) ? i18n.language : 'fr';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace('/auth/login');
  };

  return (
    <ScrollScreen
      testID="profile-scroll"
      onScroll={onScroll}
      contentContainerStyle={{
        paddingTop: 24,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: 24,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="h2" accessibilityRole="header">
          {t('profile.title')}
        </Text>
        <IconButton
          icon={Settings}
          accessibilityLabel={t('profile.settings')}
          onPress={() => router.push('/profile/settings')}
        />
      </View>

      {user ? (
        <>
          <FadeInUp>
            <View className="gap-6">
              <ProfileHeader user={user} onEditProfile={() => router.push('/profile/edit')} />
              <ProfileStats stats={user.stats ?? DEFAULT_STATS} />
            </View>
          </FadeInUp>

          <View>
            <ProfileMenuRow
              icon={SlidersHorizontal}
              label={t('profile.preferences')}
              subtitle={t('profile.preferencesSubtitle')}
              onPress={() => router.push('/profile/preferences')}
            />
            <ProfileMenuRow
              icon={Heart}
              label={t('profile.favorites')}
              subtitle={t('profile.favoritesSubtitle')}
              onPress={() => router.push('/profile/favorites')}
            />
            <ProfileMenuRow
              icon={Clock}
              label={t('profile.history')}
              subtitle={t('profile.historySubtitle')}
              onPress={() => router.push('/profile/history')}
            />
            <ProfileMenuRow
              icon={TrendingUp}
              label={t('profile.statistics')}
              subtitle={t('profile.statisticsSubtitle')}
              onPress={() => router.push('/profile/statistics')}
            />
          </View>

          <View>
            <ProfileMenuRow
              icon={Globe}
              label={t('settings.language')}
              value={t(LANGUAGE_LABEL_KEYS[language])}
              onPress={() => router.push('/profile/language')}
            />
            <ProfileMenuRow
              icon={SunMoon}
              label={t('settings.theme.title')}
              value={t(THEME_LABEL_KEYS[themePreference])}
              onPress={() => router.push('/profile/theme')}
            />
          </View>

          <View>
            <ProfileMenuRow
              icon={CircleQuestionMark}
              label={t('profile.help')}
              onPress={() => router.push('/profile/help')}
            />
            <ProfileMenuRow
              icon={Shield}
              label={t('profile.privacy')}
              onPress={() => router.push('/profile/privacy')}
            />
          </View>

          <ProfileMenuRow
            icon={LogOut}
            label={t('profile.logout')}
            tone="error"
            onPress={() => void handleLogout()}
          />
        </>
      ) : null}
    </ScrollScreen>
  );
}
