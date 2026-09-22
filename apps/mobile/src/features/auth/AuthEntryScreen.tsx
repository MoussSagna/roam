import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { brand, derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AppleIcon } from './components/AppleIcon';
import { GoogleIcon } from './components/GoogleIcon';

const background = require('../../../assets/images/auth/entry-background.jpg');

/** How long the Google/Apple buttons show a spinner before settling back (no request exists yet). */
const SOCIAL_SIMULATION_MS = 900;

type SocialProvider = 'google' | 'apple';

/**
 * Authentication entry screen (design mockup "Authentification", tile 1 "Écran d'entrée") — the
 * first screen of the authentication prototype. Front-end only: "Se connecter" and "Créer un
 * compte" navigate to their own screens (placeholders for now); Google/Apple only simulate a
 * request (`DECISIONS.md` D-29). No backend, no real session.
 */
export function AuthEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const simulateSocialSignIn = (provider: SocialProvider) => {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    setTimeout(() => setLoadingProvider(null), SOCIAL_SIMULATION_MS);
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ flex: 1 }}>
        <Image
          source={background}
          contentFit="cover"
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          accessible={false}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: derived.night,
            opacity: 0.22,
          }}
        />

        <FadeInUp
          delay={150}
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: insets.top + 64,
            alignItems: 'center',
          }}
        >
          <RNText
            accessibilityRole="header"
            style={{
              color: brand.cream,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: 42,
              lineHeight: 48,
              letterSpacing: 1,
            }}
          >
            {t('brand.name')}
          </RNText>
          <Text
            variant="bodyLg"
            style={{ color: brand.cream, opacity: 0.92, marginTop: 6, textAlign: 'center' }}
          >
            {t('auth.entry.tagline')}
          </Text>
        </FadeInUp>
      </View>

      <FadeInUp delay={300}>
        <View
          className="rounded-t-hero bg-surface px-6"
          style={{ paddingTop: 28, paddingBottom: Math.max(insets.bottom, 20) + 8 }}
        >
          <Button label={t('auth.signIn')} onPress={() => router.push('/auth/login')} />
          <Button
            label={t('auth.signUp')}
            variant="secondary"
            onPress={() => router.push('/auth/register')}
            className="mt-3"
          />

          <View className="mt-5 flex-row items-center gap-3">
            <View className="h-[1px] flex-1 bg-border" />
            <Text variant="small" tone="secondary">
              {t('auth.entry.or')}
            </Text>
            <View className="h-[1px] flex-1 bg-border" />
          </View>

          <Button
            label={t('auth.entry.continueWithGoogle')}
            variant="secondary"
            leadingIcon={<GoogleIcon size={20} />}
            loading={loadingProvider === 'google'}
            onPress={() => simulateSocialSignIn('google')}
            className="mt-5"
          />
          <Button
            label={t('auth.entry.continueWithApple')}
            variant="secondary"
            leadingIcon={<AppleIcon size={19} color={colors.text} />}
            loading={loadingProvider === 'apple'}
            onPress={() => simulateSocialSignIn('apple')}
            className="mt-3"
          />

          <Text
            variant="caption"
            tone="secondary"
            style={{ marginTop: 20, textAlign: 'center', lineHeight: 18 }}
          >
            {t('auth.entry.legalPrefix')}{' '}
            <Text variant="caption" tone="primary" style={{ textDecorationLine: 'underline' }}>
              {t('auth.entry.termsOfService')}
            </Text>{' '}
            {t('auth.entry.legalMiddle')}{' '}
            <Text variant="caption" tone="primary" style={{ textDecorationLine: 'underline' }}>
              {t('auth.entry.privacyPolicy')}
            </Text>
            .
          </Text>
        </View>
      </FadeInUp>
    </View>
  );
}
