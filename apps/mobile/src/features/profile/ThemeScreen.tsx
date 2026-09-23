import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Monitor from 'lucide-react-native/icons/monitor';
import Moon from 'lucide-react-native/icons/moon';
import Sun from 'lucide-react-native/icons/sun';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FadeInUp,
  STICKY_REVEAL_HEADER_HEIGHT,
  ScrollScreen,
  StickyRevealHeader,
  Text,
} from '@/components/ui';
import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/theme';

import { ThemeOptionRow } from './components/ThemeOptionRow';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as the other profile sub-screens' own `revealOffset` (`docs/DECISIONS.md` D-49/D-57/D-58/D-60). */
const HEADER_REVEAL_OFFSET = 70;

/** Explicit map so each value stays a typed, checked i18n key (same pattern as `categoryLabel.ts`). */
const THEME_LABEL_KEYS = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  system: 'settings.theme.system',
} as const satisfies Record<ThemePreference, string>;

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const satisfies Record<ThemePreference, LucideIcon>;

/**
 * "Thème" (profile, écran 8): Light / Dark / System, reusing `THEME_PREFERENCES`
 * (`theme/tokens.ts`) — the app's existing single source of truth for that enum — rather than a
 * second list authored in this screen. Same "derive, don't hardcode" principle as "Langue"
 * (`docs/DECISIONS.md` D-60), simpler here since the preference set is small and fixed (unlike
 * languages, it isn't meant to grow file-by-file). Selecting a row calls the existing
 * `useTheme().setPreference` (already resolves System against the OS and persists under
 * `roam.theme`, `docs/DECISIONS.md` D-05) — no second provider, no second storage mechanism.
 */
export function ThemeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Not `useCallback`, same reason as every other screen's own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="theme-scroll"
        onScroll={handleScroll}
        contentContainerStyle={{
          // `ScrollScreen`'s own `SafeAreaView` already offsets content by `insets.top`; only the
          // floating header's own height needs adding on top of that.
          paddingTop: STICKY_REVEAL_HEADER_HEIGHT + 16,
          paddingBottom: insets.bottom + 32,
          gap: 4,
        }}
      >
        <Text variant="h2" accessibilityRole="header" className="pb-4">
          {t('settings.theme.title')}
        </Text>

        <View accessibilityRole="radiogroup">
          {THEME_PREFERENCES.map((option, index) => (
            <FadeInUp key={option} delay={index * 50}>
              <ThemeOptionRow
                icon={THEME_ICONS[option]}
                label={t(THEME_LABEL_KEYS[option])}
                selected={option === preference}
                onPress={() => setPreference(option)}
              />
            </FadeInUp>
          ))}
        </View>
      </ScrollScreen>

      <StickyRevealHeader
        title={t('settings.theme.title')}
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
    </View>
  );
}
