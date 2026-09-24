import { Image } from 'expo-image';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useTranslation } from 'react-i18next';
import { type ImageSourcePropType, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';
import type { Experience, Journey } from '@/types';

import { formatDayMonth, formatDuration } from '../lib/format';

type JourneyHistoryCardProps = {
  journey: Journey;
  experiencesById: ReadonlyMap<string, Experience>;
  onPress: () => void;
};

const COLLAGE = 96;

function Cover({ source, className }: { source?: ImageSourcePropType; className: string }) {
  return (
    <View className={cx('overflow-hidden bg-surfaceElevated', className)}>
      {source ? <Image source={source} style={{ flex: 1 }} contentFit="cover" /> : null}
    </View>
  );
}

/**
 * A completed journey in the Parcours hub's history (sprint 11): a small collage of its experiences'
 * photos (one big + two stacked, or fewer), its title, "3 expériences · 3 h 20", "Terminé le 12
 * septembre" and a "Terminé" badge. The whole card opens `/journey/[id]`.
 */
export function JourneyHistoryCard({ journey, experiencesById, onPress }: JourneyHistoryCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const covers = journey.steps
    .map((step) => experiencesById.get(step.experienceId)?.coverImage)
    .filter((cover): cover is ImageSourcePropType => cover !== undefined)
    .slice(0, 3);
  const count = journey.steps.length;
  const meta = [
    count === 1 ? t('journey.hub.experienceCountOne') : t('journey.hub.experienceCount', { count }),
    formatDuration(journey.estimatedDurationMin),
  ].join(' · ');
  const completedOn = journey.completedAt
    ? t('journey.hub.completedOn', { date: formatDayMonth(journey.completedAt, i18n.language) })
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('journey.hub.openJourney', { title: journey.title })}
      accessibilityHint={[meta, completedOn].filter(Boolean).join(', ')}
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-card border border-border bg-surface p-3 active:opacity-80"
    >
      <View
        testID="journey-history-collage"
        className="flex-row gap-1 overflow-hidden rounded-large"
        style={{ width: COLLAGE, height: COLLAGE }}
      >
        {covers.length >= 3 ? (
          <>
            <Cover source={covers[0]} className="flex-[3]" />
            <View className="flex-[2] gap-1">
              <Cover source={covers[1]} className="flex-1" />
              <Cover source={covers[2]} className="flex-1" />
            </View>
          </>
        ) : covers.length === 2 ? (
          <>
            <Cover source={covers[0]} className="flex-1" />
            <Cover source={covers[1]} className="flex-1" />
          </>
        ) : (
          <Cover source={covers[0]} className="flex-1" />
        )}
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1 self-start rounded-pill bg-primary/10 px-2 py-0.5">
          <Check size={12} strokeWidth={2.5} color={colors.primary} />
          <Text variant="caption" tone="primary" className="font-bodySemibold">
            {t('journey.hub.completed')}
          </Text>
        </View>
        <Text variant="label" numberOfLines={2}>
          {journey.title}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
        {completedOn ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {completedOn}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={20} strokeWidth={1.8} color={colors.textSecondary} />
    </Pressable>
  );
}
