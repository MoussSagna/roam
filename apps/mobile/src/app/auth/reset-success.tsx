import { useTranslation } from 'react-i18next';

import { AuthPlaceholder } from '@/features/auth/AuthPlaceholder';

export default function ResetSuccessRoute() {
  const { t } = useTranslation();
  return <AuthPlaceholder title={t('auth.resetSuccess.title')} />;
}
