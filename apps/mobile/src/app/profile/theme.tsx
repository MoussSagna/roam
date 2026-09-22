import { useTranslation } from 'react-i18next';

import { ProfilePlaceholder } from '@/features/profile/components/ProfilePlaceholder';

export default function ProfileThemeRoute() {
  const { t } = useTranslation();
  return <ProfilePlaceholder title={t('settings.theme.title')} />;
}
