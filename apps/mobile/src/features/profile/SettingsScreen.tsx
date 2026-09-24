import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import Globe from 'lucide-react-native/icons/globe';
import LogOut from 'lucide-react-native/icons/log-out';
import Pencil from 'lucide-react-native/icons/pencil';
import Shield from 'lucide-react-native/icons/shield';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import SunMoon from 'lucide-react-native/icons/sun-moon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import {
  ConfirmationModal,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { isLanguage, type Language } from '@/i18n';
import { useTheme, type ThemePreference } from '@/theme';

import { ProfileMenuRow } from './components/ProfileMenuRow';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as every other profile sub-screen's own `revealOffset` (`docs/DECISIONS.md`). */
const HEADER_REVEAL_OFFSET = 70;

/** Explicit maps so each value stays a typed, checked i18n key (same pattern as `categoryLabel.ts`). */
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
 * "Paramètres" (`/profile/settings`, sprint 5 "Profile / Settings" refactor): account and app
 * configuration, moved out of `ProfileScreen` — préférences/langue/thème/aide/confidentialité/
 * déconnexion. Reached from the gear icon on Profile (unchanged route, already wired before this
 * session). Every row reuses `ProfileMenuRow` and an existing route; no new pattern, no new screen
 * behind any of them (`docs/DECISIONS.md`).
 */
export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, preference: themePreference } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutConfirmed, setLogoutConfirmed] = useState(false);

  const language: Language = isLanguage(i18n.language) ? i18n.language : 'fr';

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.replace('/auth/login');
  };

  // Logging out removes this screen (`Stack.Protected`), so the dialog must be gone first: confirm
  // closes it, and the logout itself runs once it has exited (`onExited`, D-78).
  const confirmLogout = () => {
    setLogoutConfirmed(true);
    setLogoutModalVisible(false);
  };

  // Not `useCallback`, same reason as every other screen's own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="settings-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + 32,
          gap: 24,
        }}
      >
        <Text variant="h2" accessibilityRole="header">
          {t('settings.title')}
        </Text>

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.sections.account')}
          </Text>
          <ProfileMenuRow
            icon={Pencil}
            label={t('profile.editProfile')}
            onPress={() => router.push('/profile/edit')}
          />
        </View>

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.sections.preferences')}
          </Text>
          <ProfileMenuRow
            icon={SlidersHorizontal}
            label={t('profile.preferences')}
            subtitle={t('profile.preferencesSubtitle')}
            onPress={() => router.push('/profile/preferences')}
          />
        </View>

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.appearance')}
          </Text>
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

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.sections.support')}
          </Text>
          <ProfileMenuRow
            icon={CircleQuestionMark}
            label={t('profile.help')}
            onPress={() => router.push('/profile/help')}
          />
        </View>

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.sections.privacyData')}
          </Text>
          <ProfileMenuRow
            icon={Shield}
            label={t('profile.privacy')}
            onPress={() => router.push('/profile/privacy')}
          />
        </View>

        <View className="gap-2">
          <Text variant="caption" tone="secondary">
            {t('settings.sections.session')}
          </Text>
          <ProfileMenuRow
            icon={LogOut}
            label={t('profile.logout')}
            tone="error"
            onPress={() => setLogoutModalVisible(true)}
          />
        </View>
      </ScrollScreen>

      <StickyRevealHeader
        title={t('settings.title')}
        scrollY={scrollY}
        revealOffset={HEADER_REVEAL_OFFSET}
        leftSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          >
            <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
          </Pressable>
        }
      />

      <ConfirmationModal
        visible={logoutModalVisible}
        title={t('profile.logoutConfirm.title')}
        description={t('profile.logoutConfirm.description')}
        confirmLabel={t('profile.logout')}
        cancelLabel={t('common.cancel')}
        icon={LogOut}
        loading={loggingOut}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={confirmLogout}
        onExited={() => {
          if (logoutConfirmed) void handleLogout();
        }}
      />
    </View>
  );
}
