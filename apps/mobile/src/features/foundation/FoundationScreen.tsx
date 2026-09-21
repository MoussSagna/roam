import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Logo } from '@/components/brand/Logo';
import { Button, Chip, FadeInUp, Screen, Text } from '@/components/ui';
import { setLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import { THEME_PREFERENCES, useTheme } from '@/theme';

/**
 * TEMPORARY screen that proves the technical foundation works (routing, NativeWind, Moti,
 * theme, i18n, fonts). It is replaced by the real Splash screen in the next sprint.
 */
export function FoundationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { preference, setPreference } = useTheme();

  return (
    <Screen>
      <ScrollView contentContainerClassName="flex-grow justify-center gap-8 py-8">
        <FadeInUp>
          <View className="items-center gap-3">
            <Logo size={88} />
            <Text variant="display" tone="primary" accessibilityRole="header">
              {t('brand.name')}
            </Text>
            <Text variant="bodyLg" tone="secondary" className="text-center">
              {t('welcome.subtitle')}
            </Text>
          </View>
        </FadeInUp>

        <View className="gap-3 rounded-card border border-border bg-surface p-6">
          <Text variant="h3">{t('foundation.typographySample')}</Text>
          <Text variant="body" tone="secondary">
            {t('foundation.bodySample')}
          </Text>
        </View>

        <FadeInUp delay={300} style={{ alignSelf: 'center' }}>
          <View className="flex-row items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2">
            <View className="h-2 w-2 rounded-pill bg-accent" />
            <Text variant="caption" tone="secondary">
              {t('foundation.motiBadge')}
            </Text>
          </View>
        </FadeInUp>

        <View className="gap-4">
          <View className="gap-2">
            <Text variant="caption" tone="secondary">
              {t('settings.appearance')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {THEME_PREFERENCES.map((option) => (
                <Chip
                  key={option}
                  label={t(`settings.theme.${option}`)}
                  selected={preference === option}
                  onPress={() => setPreference(option)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="secondary">
              {t('settings.language')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUPPORTED_LANGUAGES.map((language) => (
                <Chip
                  key={language}
                  label={t(`settings.languages.${language}`)}
                  selected={i18n.resolvedLanguage === language}
                  onPress={() => void setLanguage(language)}
                />
              ))}
            </View>
          </View>
        </View>

        <Button label={t('common.continue')} onPress={() => router.push('/welcome')} />
      </ScrollView>
    </Screen>
  );
}
