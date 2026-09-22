import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';

import { AppleIcon } from './AppleIcon';
import { GoogleIcon } from './GoogleIcon';

/** How long the buttons show a spinner before settling back (no request exists yet). */
const SOCIAL_SIMULATION_MS = 900;

type SocialProvider = 'google' | 'apple';

/**
 * "Continuer avec Google/Apple" — shared by every auth screen that offers them (entry, login,
 * register…). Front-end only: simulates a request, then resets; there is nothing to navigate to
 * yet (no backend, and the mockup's post-auth screens aren't built — `DECISIONS.md` D-29).
 */
export function SocialButtons() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const simulate = (provider: SocialProvider) => {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    setTimeout(() => setLoadingProvider(null), SOCIAL_SIMULATION_MS);
  };

  return (
    <>
      <Button
        label={t('auth.continueWithGoogle')}
        variant="secondary"
        leadingIcon={<GoogleIcon size={20} />}
        loading={loadingProvider === 'google'}
        onPress={() => simulate('google')}
      />
      <Button
        label={t('auth.continueWithApple')}
        variant="secondary"
        leadingIcon={<AppleIcon size={19} color={colors.text} />}
        loading={loadingProvider === 'apple'}
        onPress={() => simulate('apple')}
        className="mt-3"
      />
    </>
  );
}
