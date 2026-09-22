import { useRouter } from 'expo-router';
import Mail from 'lucide-react-native/icons/mail';
import MailOpen from 'lucide-react-native/icons/mail-open';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text as RNText } from 'react-native';

import { Button, FadeInUp, Screen, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AuthTopBar } from './components/AuthTopBar';

/** How long "Envoyer le code" simulates a request before moving to the code screen (no backend). */
const SEND_CODE_SIMULATION_MS = 900;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgot password screen (design mockup "Authentification", tile 4 "Mot de passe oublié") —
 * front-end only. There is no backend to send an email through, so a well-formed email simulates
 * a request and moves on to the (not yet built) reset-code screen (`DECISIONS.md` D-33).
 */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scheme, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  const handleSubmit = () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('validation.required'));
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(t('validation.emailInvalid'));
      return;
    }
    setError(undefined);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/auth/reset-code');
    }, SEND_CODE_SIMULATION_MS);
  };

  return (
    <Screen className="px-6">
      <AuthTopBar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
              {t('auth.forgotPassword')}
            </RNText>
            <Text variant="bodyLg" tone="secondary" style={{ marginTop: 6, lineHeight: 24 }}>
              {t('auth.forgotPasswordScreen.subtitle')}
            </Text>
          </FadeInUp>

          <FadeInUp delay={100} style={{ marginTop: 28 }}>
            <TextField
              label={t('auth.email')}
              icon={Mail}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(undefined);
              }}
              error={error}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />

            <Button
              label={t('auth.forgotPasswordScreen.submit')}
              loading={loading}
              onPress={handleSubmit}
              className="mt-6"
            />
          </FadeInUp>

          <FadeInUp delay={200} style={{ marginTop: 56, alignItems: 'center' }}>
            <MailOpen size={64} strokeWidth={1.5} color={headingColor} accessible={false} />
            <Text
              variant="body"
              tone="secondary"
              style={{ marginTop: 20, textAlign: 'center', lineHeight: 24 }}
            >
              {t('auth.forgotPasswordScreen.hint')}
            </Text>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
