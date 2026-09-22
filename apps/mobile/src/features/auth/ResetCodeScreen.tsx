import { useLocalSearchParams, useRouter } from 'expo-router';
import MailWarning from 'lucide-react-native/icons/mail-warning';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';

import { Button, FadeInUp, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AuthTopBar } from './components/AuthTopBar';
import { OtpInput } from './components/OtpInput';

const CODE_LENGTH = 6;

/** How long "Continuer" simulates a request before moving to the new-password screen (no backend). */
const VERIFY_SIMULATION_MS = 900;

/**
 * Reset-code screen (design mockup "Authentification", tile 5 "Code de réinitialisation") —
 * front-end only. There is no backend to check the code against, so any complete 6-digit code
 * "succeeds": the screen simulates a request and moves on (`DECISIONS.md` D-34).
 */
export function ResetCodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scheme, colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  const handleContinue = () => {
    if (loading) return;
    if (code.length < CODE_LENGTH) {
      setError(true);
      return;
    }
    setError(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/auth/new-password');
    }, VERIFY_SIMULATION_MS);
  };

  const handleResend = () => {
    setCode('');
    setError(false);
  };

  return (
    <Screen className="px-6">
      <AuthTopBar />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <FadeInUp>
          <RNText
            accessibilityRole="header"
            style={{
              marginTop: 28,
              color: headingColor,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: 30,
              lineHeight: 37,
            }}
          >
            {t('auth.resetCode.title')}
          </RNText>
          <Text variant="bodyLg" tone="secondary" style={{ marginTop: 6 }}>
            {t('auth.resetCode.subtitle')}
          </Text>
          {email ? (
            <Text variant="bodyLg" style={{ marginTop: 2 }} className="font-bodySemibold">
              {email}
            </Text>
          ) : null}
        </FadeInUp>

        <FadeInUp delay={100} style={{ marginTop: 32 }}>
          <OtpInput
            value={code}
            onChangeValue={(value) => {
              setCode(value);
              if (error) setError(false);
            }}
            error={error}
          />
          {error ? (
            <Text variant="small" tone="error" style={{ marginTop: 8, textAlign: 'center' }}>
              {t('validation.codeIncomplete')}
            </Text>
          ) : (
            <Text variant="small" tone="secondary" style={{ marginTop: 12, textAlign: 'center' }}>
              {t('auth.resetCode.expiry')}
            </Text>
          )}

          <Button
            label={t('auth.resetCode.continue')}
            loading={loading}
            onPress={handleContinue}
            className="mt-6"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.resetCode.resend')}
            onPress={handleResend}
            hitSlop={8}
            className="mt-4 self-center active:opacity-60"
          >
            <Text variant="body" tone="primary" className="font-bodySemibold">
              {t('auth.resetCode.resend')}
            </Text>
          </Pressable>
        </FadeInUp>

        <FadeInUp delay={200}>
          <View className="mt-8 items-center rounded-large bg-primary/5 px-6 py-6">
            <MailWarning size={40} strokeWidth={1.5} color={headingColor} accessible={false} />
            <Text
              variant="body"
              style={{ marginTop: 12, textAlign: 'center' }}
              className="font-bodySemibold"
            >
              {t('auth.resetCode.helpTitle')}
            </Text>
            <Text
              variant="small"
              tone="secondary"
              style={{ marginTop: 4, textAlign: 'center', lineHeight: 20 }}
            >
              {t('auth.resetCode.helpBody')}
            </Text>
          </View>
        </FadeInUp>
      </ScrollView>
    </Screen>
  );
}
