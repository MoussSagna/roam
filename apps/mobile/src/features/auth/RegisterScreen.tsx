import { useRouter } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import Mail from 'lucide-react-native/icons/mail';
import User from 'lucide-react-native/icons/user';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text as RNText, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, FadeInUp, Screen, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AuthFooterLink } from './components/AuthFooterLink';
import { AuthTopBar } from './components/AuthTopBar';
import { OrDivider } from './components/OrDivider';
import {
  HAS_LETTER_AND_NUMBER,
  HAS_MIN_LENGTH,
  PasswordRequirements,
} from './components/PasswordRequirements';
import { SocialButtons } from './components/SocialButtons';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  firstName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

/**
 * Register screen (design mockup "Authentification", tile 3 "Inscription") — front-end only.
 * There is no backend to create an account against, so a well-formed submission validates
 * locally, then `useAuth().login()` simulates the request and marks the mocked session as active,
 * same as `LoginScreen` (`DECISIONS.md` D-32, and the sprint 3 mocked-auth-session pass).
 */
export function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scheme, colors } = useTheme();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!firstName.trim()) next.firstName = t('validation.required');
    if (!email.trim()) next.email = t('validation.required');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('validation.emailInvalid');
    if (!password) next.password = t('validation.required');
    else if (!HAS_MIN_LENGTH(password) || !HAS_LETTER_AND_NUMBER(password)) {
      next.password = t('validation.passwordWeak');
    }
    if (!confirmPassword) next.confirmPassword = t('validation.required');
    else if (password && confirmPassword !== password) {
      next.confirmPassword = t('validation.passwordMismatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    await login();
    setLoading(false);
    router.replace('/home');
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
              {t('auth.register.title')}
            </RNText>
            <Text variant="bodyLg" tone="secondary" style={{ marginTop: 6, lineHeight: 24 }}>
              {t('auth.register.subtitle')}
            </Text>
          </FadeInUp>

          <FadeInUp delay={100} style={{ marginTop: 28 }}>
            <TextField
              label={t('auth.register.firstName')}
              icon={User}
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: undefined }));
              }}
              error={errors.firstName}
              placeholder={t('auth.register.firstNamePlaceholder')}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
            />
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
              className="mt-4"
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
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="next"
              className="mt-4"
            />

            <View className="mt-3">
              <PasswordRequirements password={password} />
            </View>

            <TextField
              label={t('auth.register.confirmPassword')}
              icon={Lock}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              secureTextEntry
              showLabel={t('auth.showConfirmPassword')}
              hideLabel={t('auth.hideConfirmPassword')}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              className="mt-4"
            />

            <Button
              label={t('auth.register.submit')}
              loading={loading}
              onPress={handleSignUp}
              className="mt-6"
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
              prompt={t('auth.footer.hasAccount')}
              actionLabel={t('auth.signIn')}
              onPress={() => router.push('/auth/login')}
            />
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
