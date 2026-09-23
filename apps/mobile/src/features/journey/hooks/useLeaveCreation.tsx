import { useNavigation } from 'expo-router';
import LogOut from 'lucide-react-native/icons/log-out';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmationModal } from '@/components/ui';

import { useJourneyDraft } from '../JourneyDraftContext';

/**
 * Leaving the creation flow from any of its screens: straight away when nothing was entered yet,
 * otherwise after "Quitter la création ?" (`ConfirmationModal`). The whole `/journey/create` stack is
 * popped from the root stack (its provider — the draft — goes with it). Navigation happens once the
 * dialog has exited (`onExited`, D-78): the screen rendering it is removed by that navigation.
 */
export function useLeaveCreation() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { hasInput } = useJourneyDraft();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const leave = useCallback(() => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
  }, [navigation]);

  const requestLeave = useCallback(() => {
    if (hasInput) setConfirmVisible(true);
    else leave();
  }, [hasInput, leave]);

  const quitModal = (
    <ConfirmationModal
      visible={confirmVisible}
      title={t('journey.quit.title')}
      description={t('journey.quit.description')}
      confirmLabel={t('journey.quit.leave')}
      cancelLabel={t('journey.quit.stay')}
      variant="destructive"
      icon={LogOut}
      onConfirm={() => {
        setConfirmed(true);
        setConfirmVisible(false);
      }}
      onCancel={() => setConfirmVisible(false)}
      onExited={() => {
        if (confirmed) leave();
      }}
    />
  );

  return { requestLeave, quitModal };
}
