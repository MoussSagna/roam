import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MapPin from 'lucide-react-native/icons/map-pin';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { RoamMap } from '@/features/map/components/RoamMap';
import { toMapMarkers } from '@/features/map/lib/markers';
import { useTheme } from '@/theme';
import { brand } from '@/theme/palette';
import type { Experience } from '@/types';

import { useAddressActions } from '../useAddressActions';

import { AddressActionsBubble } from './AddressActionsBubble';

/** Height of the static map preview inside the block. */
const MAP_HEIGHT = 160;

type MapPreviewRowProps = {
  experience: Experience;
  /** Opens the full-screen map (`experience-map/[id]`). */
  onPress: () => void;
};

/**
 * Experience detail's map block (D-73, D-74): a rounded card made of two independent touch targets.
 * **The map** — a real, static `RoamMap` (`interactive={false}`: no pan/zoom, the touch falls through)
 * with the experience's pin and a "Voir sur la carte" pill — opens the full-screen map. **The address
 * row** underneath opens the address actions bubble (copy address / GPS, open in Plans / Google Maps).
 * Without `coordinates` there is no map (nothing to open) and the bubble only offers "Copier l'adresse".
 */
export function MapPreviewRow({ experience, onPress }: MapPreviewRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const markers = useMemo(() => toMapMarkers([experience]), [experience]);
  const address = experience.address ?? experience.location;
  const hasMap = markers.length > 0;

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const closeBubble = useCallback(() => setBubbleVisible(false), []);
  const actions = useAddressActions({
    address: address ?? '',
    placeName: experience.title,
    coordinates: experience.coordinates,
    onDone: closeBubble,
  });

  if (!hasMap && !address) {
    return null;
  }

  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface">
      {hasMap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('experience.seeOnMap')}
          onPress={onPress}
          style={{ height: MAP_HEIGHT }}
          testID="experience-map-preview"
          className="active:opacity-90"
        >
          <RoamMap
            markers={markers}
            selectedMarkerId={experience.id}
            rounded={false}
            interactive={false}
            testID="experience-detail-map"
          />
          <View
            pointerEvents="none"
            className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-pill bg-overlay/70 py-2 pl-4 pr-3"
          >
            <Text variant="small" className="font-bodyMedium text-white">
              {t('experience.seeOnMap')}
            </Text>
            <ChevronRight size={14} strokeWidth={2} color={brand.white} />
          </View>
        </Pressable>
      ) : null}

      {address ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={address}
          accessibilityHint={t('experience.addressActions.title')}
          onPress={() => setBubbleVisible(true)}
          testID="experience-address-row"
          className="flex-row items-center gap-3 p-4 active:opacity-70"
        >
          <MapPin size={18} strokeWidth={1.8} color={colors.textSecondary} />
          <Text variant="body" className="flex-1">
            {address}
          </Text>
          <ChevronRight size={18} strokeWidth={1.8} color={colors.textSecondary} />
        </Pressable>
      ) : null}

      <AddressActionsBubble
        visible={bubbleVisible}
        address={address ?? ''}
        actions={actions}
        onClose={closeBubble}
      />
    </View>
  );
}
