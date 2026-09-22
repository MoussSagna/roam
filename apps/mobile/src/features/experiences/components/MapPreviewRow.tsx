import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui';
import { MAP_ASPECT, MapPreview } from '@/features/onboarding/components/MapPreview';
import { useTheme } from '@/theme';

/** Outer `Screen` padding (`px-6` = 24) + this row's own card padding (`p-4` = 16), each side. */
const HORIZONTAL_INSET = (24 + 16) * 2;
const MAP_MAX_HEIGHT = 160;

type MapPreviewRowProps = {
  location: string;
  address?: string;
};

/**
 * "Voir sur la carte" (sprint 5 §18): reuses the onboarding `MapPreview` illustration rather than a
 * new placeholder — no real map provider chosen yet (`04_TECH_STACK.md`), and the brief explicitly
 * asks not to wire one up this sprint. Not yet navigable: there is no map screen to open (D-48).
 */
export function MapPreviewRow({ location, address }: MapPreviewRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const mapWidth = screenWidth - HORIZONTAL_INSET;
  const mapHeight = Math.min(MAP_MAX_HEIGHT, Math.round(mapWidth * MAP_ASPECT));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('experience.seeOnMap')}
      className="gap-3 overflow-hidden rounded-card border border-border bg-surface p-4 active:opacity-90"
    >
      <View style={{ height: mapHeight, borderRadius: 16, overflow: 'hidden' }}>
        <MapPreview
          width={mapWidth}
          height={mapHeight}
          city={location}
          country={address ?? location}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text variant="body" className="font-bodyMedium">
          {t('experience.seeOnMap')}
        </Text>
        <ArrowRight size={16} strokeWidth={2} color={colors.primary} />
      </View>
    </Pressable>
  );
}
