import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MapPin from 'lucide-react-native/icons/map-pin';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { RoamMap } from '@/features/map/components/RoamMap';
import { toMapMarkers } from '@/features/map/lib/markers';
import { useTheme } from '@/theme';
import { brand } from '@/theme/palette';
import type { Experience } from '@/types';

/** Height of the static map preview inside the block. */
const MAP_HEIGHT = 160;

type MapPreviewRowProps = {
  experience: Experience;
  /** Opens the full-screen map (`experience-map/[id]`). */
  onPress: () => void;
};

/**
 * Experience detail's map block (D-73), replacing the illustrated `MapPreview` of sprint 5: a real,
 * static `RoamMap` (`interactive={false}` — no pan/zoom, touches fall through) showing the
 * experience's own pin, a "Voir sur la carte" pill on it, and the address underneath. The whole block
 * is one `Pressable` that opens the full-screen map. Without coordinates there is nothing to draw, so
 * the map part is left out and only the address row remains (nothing to open then).
 */
export function MapPreviewRow({ experience, onPress }: MapPreviewRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const markers = useMemo(() => toMapMarkers([experience]), [experience]);
  const address = experience.address ?? experience.location;
  const hasMap = markers.length > 0;

  const content = (
    <>
      {hasMap ? (
        <View style={{ height: MAP_HEIGHT }} testID="experience-map-preview">
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
        </View>
      ) : null}

      {address ? (
        <View className="flex-row items-center gap-3 p-4">
          <MapPin size={18} strokeWidth={1.8} color={colors.textSecondary} />
          <Text variant="body" className="flex-1">
            {address}
          </Text>
          {hasMap ? (
            <ChevronRight size={18} strokeWidth={1.8} color={colors.textSecondary} />
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (!hasMap) {
    return address ? (
      <View className="overflow-hidden rounded-card border border-border bg-surface">
        {content}
      </View>
    ) : null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('experience.seeOnMap')}
      onPress={onPress}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      {content}
    </Pressable>
  );
}
