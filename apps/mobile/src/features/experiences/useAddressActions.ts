import * as Clipboard from 'expo-clipboard';
import type { LucideIcon } from 'lucide-react-native';
import Copy from 'lucide-react-native/icons/copy';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import MapIcon from 'lucide-react-native/icons/map';
import Navigation from 'lucide-react-native/icons/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';

import { formatCoordinates, getGoogleMapsUrl, getPlansUrl } from '@/features/map/lib/externalMaps';
import { showToast } from '@/lib/toast';
import type { Coordinates } from '@/types';

export type AddressAction = {
  key: 'copyAddress' | 'copyCoordinates' | 'openPlans' | 'openGoogleMaps';
  label: string;
  icon: LucideIcon;
  onPress: () => void;
};

type UseAddressActionsParams = {
  /** What "Copier l'adresse" copies, and the label given to the external maps app. */
  address: string;
  placeName: string;
  coordinates?: Coordinates;
  /** Called first by every action, so the bubble is already gone when a toast/app switch happens. */
  onDone: () => void;
};

/**
 * The address bubble's four actions (D-74): copy the address, copy the GPS coordinates, open Apple Plans,
 * open Google Maps. Copying uses `expo-clipboard` + the app's own toast (`showToast`); opening is
 * `Linking.openURL` on a plain URL (`lib/externalMaps.ts`) — no Maps API, no key. Fallbacks: without
 * `coordinates` only "Copier l'adresse" exists; "Plans" is iOS-only (Apple Plans doesn't exist on
 * Android — Google Maps covers it there); a link that can't be opened shows an error toast.
 */
export function useAddressActions({
  address,
  placeName,
  coordinates,
  onDone,
}: UseAddressActionsParams): AddressAction[] {
  const { t } = useTranslation();

  return useMemo(() => {
    async function copy(text: string, successTitle: string) {
      onDone();
      try {
        await Clipboard.setStringAsync(text);
        showToast('success', { title: successTitle });
      } catch {
        showToast('error', { title: t('experience.addressActions.openError') });
      }
    }

    async function open(url: string) {
      onDone();
      try {
        await Linking.openURL(url);
      } catch {
        showToast('error', { title: t('experience.addressActions.openError') });
      }
    }

    const actions: AddressAction[] = [
      {
        key: 'copyAddress',
        label: t('experience.addressActions.copyAddress'),
        icon: Copy,
        onPress: () => void copy(address, t('experience.addressActions.addressCopied')),
      },
    ];

    if (coordinates) {
      actions.push({
        key: 'copyCoordinates',
        label: t('experience.addressActions.copyCoordinates'),
        icon: LocateFixed,
        onPress: () =>
          void copy(
            formatCoordinates(coordinates),
            t('experience.addressActions.coordinatesCopied'),
          ),
      });
      if (Platform.OS === 'ios') {
        actions.push({
          key: 'openPlans',
          label: t('experience.addressActions.openPlans'),
          icon: Navigation,
          onPress: () => void open(getPlansUrl(coordinates, placeName)),
        });
      }
      actions.push({
        key: 'openGoogleMaps',
        label: t('experience.addressActions.openGoogleMaps'),
        icon: MapIcon,
        onPress: () => void open(getGoogleMapsUrl(coordinates)),
      });
    }

    return actions;
  }, [address, placeName, coordinates, onDone, t]);
}
