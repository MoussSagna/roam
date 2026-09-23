import Footprints from 'lucide-react-native/icons/footprints';
import TrainFront from 'lucide-react-native/icons/train-front';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { JourneyTravelMode } from '@/types';

import { formatDistance, formatDuration } from '../lib/format';

type TravelConnectorProps = {
  mode: JourneyTravelMode;
  durationMin: number;
  distanceM: number;
};

/** The leg between two steps of a timeline: "12 min à pied · 900 m" / "8 min en métro · 2,4 km",
 * aligned on the timeline's rail (`06_DESIGN_SYSTEM.md` → TravelConnector). */
export function TravelConnector({ mode, durationMin, distanceM }: TravelConnectorProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const Icon = mode === 'metro' ? TrainFront : Footprints;
  const label = t(mode === 'metro' ? 'journey.travel.metro' : 'journey.travel.walk', {
    duration: formatDuration(durationMin),
  });

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${formatDistance(distanceM, i18n.language)}`}
      className="flex-row items-center gap-3 py-2"
    >
      <View className="w-14 items-center">
        <View className="h-8 w-8 items-center justify-center rounded-pill bg-primary/10">
          <Icon size={16} strokeWidth={1.8} color={colors.primary} />
        </View>
      </View>
      <Text variant="small" tone="secondary">
        {label} · {formatDistance(distanceM, i18n.language)}
      </Text>
    </View>
  );
}
