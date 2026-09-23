import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback } from 'react';
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
import { getAvailableLanguages, isLanguage, setLanguage, type Language } from '@/i18n';
import { useTheme } from '@/theme';

import { LanguageOptionRow } from './components/LanguageOptionRow';

/** Roughly the height of the in-content title below — same "proxy, not a pixel-exact measurement"
 * approach as the other profile sub-screens' own `revealOffset` (`docs/DECISIONS.md` D-49/D-57/D-58). */
const HEADER_REVEAL_OFFSET = 70;

/**
 * "Langue" (profile, écran 7): the active language, and every other one the user can switch to. The
 * list is never hardcoded here — `getAvailableLanguages()` (`src/i18n/index.ts`) derives it from the
 * i18n resources themselves, so adding a locale file needs no change to this screen
 * (`docs/DECISIONS.md`). Selecting a row calls the existing `setLanguage()` (switches `i18n` and
 * persists under `roam.language`, `docs/05_THEME_AND_I18N.md`) — no second provider, no second
 * storage mechanism.
 */
export function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const languages = getAvailableLanguages();
  const currentLanguage: Language = isLanguage(i18n.language) ? i18n.language : 'fr';

  // Not `useCallback`, same reason as every other screen's own `handleScroll`: mutating a shared
  // value from inside a memoized callback trips this project's ref-immutability lint rule.
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }

  const handleSelect = useCallback((language: Language) => {
    void setLanguage(language);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollScreen
        testID="language-scroll"
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
          {t('settings.language')}
        </Text>

        <View accessibilityRole="radiogroup">
          {languages.map((option, index) => (
            <FadeInUp key={option.code} delay={index * 50}>
              <LanguageOptionRow
                option={option}
                selected={option.code === currentLanguage}
                onPress={handleSelect}
              />
            </FadeInUp>
          ))}
        </View>
      </ScrollScreen>

      <StickyRevealHeader
        title={t('settings.language')}
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
