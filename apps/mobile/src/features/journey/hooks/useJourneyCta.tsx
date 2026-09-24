import { useRouter } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import Plus from 'lucide-react-native/icons/plus';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmationModal } from '@/components/ui';
import { showToast } from '@/lib/toast';
import type { Experience } from '@/types';

import { addExperienceToJourney, useJourney } from '../journeyStore';

type Confirmation = { kind: 'added' | 'alreadyAdded'; title: string } | null;

/**
 * Experience detail's journey CTA (sprint 10), driven by the journey state:
 * - no journey (or a completed one) → "Créer mon parcours" → the creation flow, this experience
 *   pre-selected;
 * - an active journey → "Ajouter au parcours" → added to that journey (never a new one, never twice),
 *   then "Ajouté à ton parcours ✓" with "Voir mon parcours" / "Fermer".
 * Navigation from the dialog waits for it to exit (`onExited`, D-78).
 */
export function useJourneyCta(experience: Experience | null) {
  const { t } = useTranslation();
  const router = useRouter();
  const { journey, state } = useJourney();
  const [adding, setAdding] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [viewRequested, setViewRequested] = useState(false);

  const isActive = state === 'active';

  const onPress = async () => {
    if (!experience || adding) return;
    if (!isActive) {
      router.push({ pathname: '/journey/create', params: { experienceId: experience.id } });
      return;
    }
    setAdding(true);
    try {
      const result = await addExperienceToJourney(experience.id);
      if (result === 'noActiveJourney') {
        router.push({ pathname: '/journey/create', params: { experienceId: experience.id } });
      } else {
        setConfirmation({ kind: result, title: experience.title });
        setConfirmationVisible(true);
      }
    } catch {
      showToast('error', { title: t('journey.added.error') });
    } finally {
      setAdding(false);
    }
  };

  const modal = (
    <ConfirmationModal
      visible={confirmationVisible}
      title={t(
        confirmation?.kind === 'alreadyAdded'
          ? 'journey.added.alreadyTitle'
          : 'journey.added.title',
      )}
      description={t(
        confirmation?.kind === 'alreadyAdded'
          ? 'journey.added.alreadyDescription'
          : 'journey.added.description',
        { title: confirmation?.title ?? '' },
      )}
      confirmLabel={t('journey.added.view')}
      cancelLabel={t('common.close')}
      icon={Check}
      onConfirm={() => {
        setViewRequested(true);
        setConfirmationVisible(false);
      }}
      onCancel={() => setConfirmationVisible(false)}
      onExited={() => {
        if (viewRequested && journey) {
          setViewRequested(false);
          router.push({ pathname: '/journey/[id]', params: { id: journey.id } });
        }
      }}
    />
  );

  return {
    label: t(isActive ? 'experience.addToJourney' : 'experience.createItinerary'),
    icon: isActive ? Plus : Sparkles,
    loading: adding,
    onPress: () => void onPress(),
    modal,
  };
}
