import { useRouter } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import Mail from 'lucide-react-native/icons/mail';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  View,
} from 'react-native';

import { Button, FadeInUp, Screen, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AuthFooterLink } from './components/AuthFooterLink';
import { AuthTopBar } from './components/AuthTopBar';
import { OrDivider } from './components/OrDivider';
import { SocialButtons } from './components/SocialButtons';

/** How long "Se connecter" simulates a request before entering the app (no backend). */
const SIGN_IN_SIMULATION_MS = 900;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = { email?: string; password?: string };

/**
 * Login screen (design mockup "Authentification", tile 2 "Connexion") — front-end only. There is
 * no backend to check credentials against, so any well-formed, non-empty input "succeeds": the
 * screen simulates a request and enters the app directly (`DECISIONS.md` D-31).
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scheme, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!email.trim()) next.email = t('validation.required');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('validation.emailInvalid');
    if (!password) next.password = t('validation.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignIn = () => {
    if (loading || !validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/home');
    }, SIGN_IN_SIMULATION_MS);
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
                fontSize: 33,
                lineHeight: 40,
              }}
            >
              {t('auth.login.title')}
            </RNText>
            <Text variant="bodyLg" tone="secondary" style={{ marginTop: 6, lineHeight: 24 }}>
              {t('auth.login.subtitle')}
            </Text>
          </FadeInUp>

          <FadeInUp delay={100} style={{ marginTop: 28 }}>
            <TextField
              label={t('auth.email')}
              icon={Mail}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextField
              label={t('auth.password')}
              icon={Lock}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              className="mt-4"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.forgotPassword')}
              onPress={() => router.push('/auth/forgot-password')}
              hitSlop={8}
              className="mt-3 self-end active:opacity-60"
            >
              <Text variant="small" tone="primary" className="font-bodySemibold">
                {t('auth.forgotPassword')}
              </Text>
            </Pressable>

            <Button
              label={t('auth.signIn')}
              loading={loading}
              onPress={handleSignIn}
              className="mt-5"
            />

            <View className="mt-6">
              <OrDivider />
            </View>
            <View className="mt-5">
              <SocialButtons />
            </View>
          </FadeInUp>

          <FadeInUp delay={150} style={{ marginTop: 24 }}>
            <AuthFooterLink
              prompt={t('auth.footer.noAccount')}
              actionLabel={t('auth.signUp')}
              onPress={() => router.push('/auth/register')}
            />
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
