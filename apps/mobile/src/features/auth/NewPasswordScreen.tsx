import { useRouter } from 'expo-router';
import Lock from 'lucide-react-native/icons/lock';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text as RNText, View } from 'react-native';

import { Button, FadeInUp, Screen, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';
import { derived } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';

import { AuthTopBar } from './components/AuthTopBar';
import {
  HAS_LETTER_AND_NUMBER,
  HAS_MIN_LENGTH,
  PasswordRequirements,
} from './components/PasswordRequirements';

/** How long "Mettre à jour" simulates a request before moving to the success screen (no backend). */
const UPDATE_SIMULATION_MS = 900;

type FormErrors = { password?: string; confirmPassword?: string };

/**
 * New password screen (design mockup "Authentification", tile 6 "Nouveau mot de passe") —
 * front-end only. There is no backend to actually change a password, so a well-formed submission
 * simulates a request and moves on to the (not yet built) success screen (`DECISIONS.md` D-35).
 */
export function NewPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scheme, colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Measured on the mockup (light theme only, D-31); on a dark background it would be unreadable.
  const headingColor = scheme === 'dark' ? colors.text : derived.authHeading;

  const validate = (): boolean => {
    const next: FormErrors = {};
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

  const handleSubmit = () => {
    if (loading || !validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/auth/reset-success');
    }, UPDATE_SIMULATION_MS);
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
              {t('auth.newPassword.title')}
            </RNText>
            <Text variant="bodyLg" tone="secondary" style={{ marginTop: 6, lineHeight: 24 }}>
              {t('auth.newPassword.subtitle')}
            </Text>
          </FadeInUp>

          <FadeInUp delay={100} style={{ marginTop: 28 }}>
            <TextField
              label={t('auth.newPassword.label')}
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
              onSubmitEditing={handleSubmit}
              className="mt-4"
            />

            <Button
              label={t('auth.newPassword.submit')}
              loading={loading}
              onPress={handleSubmit}
              className="mt-6"
            />
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
