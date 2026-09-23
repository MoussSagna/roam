import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Collection } from '@/types';

type DiscoverCollectionCardVariant = 'hero' | 'compact';

type DiscoverCollectionCardProps = {
  collection: Collection;
  variant: DiscoverCollectionCardVariant;
  onPress: (collection: Collection) => void;
};

const HERO_HEIGHT = 220;
const COMPACT_WIDTH = 180;
const COMPACT_HEIGHT = 220;
const SCREEN_PADDING = 24 * 2;

/**
 * Discover's collection card, configurable rather than duplicated (sprint 6 brief §7 "Composants"):
 * `variant="hero"` is the large, editorial "Sélection ROAM" card (image, then title/subtitle/CTA below
 * it — same "image on top, content below" shape as Home's `ExperienceCard`); `variant="compact"`
 * overlays its title on the image instead, for the smaller "Explorer par envie" grid.
 */
export function DiscoverCollectionCard({
  collection,
  variant,
  onPress,
}: DiscoverCollectionCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  if (variant === 'compact') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collection.title}
        onPress={() => onPress(collection)}
        style={{ width: COMPACT_WIDTH, height: COMPACT_HEIGHT }}
        className="overflow-hidden rounded-card bg-surfaceElevated active:opacity-90"
      >
        {collection.coverImage ? (
          <Image
            source={collection.coverImage}
            style={{ flex: 1 }}
            contentFit="cover"
            accessible
            accessibilityIgnoresInvertColors
            accessibilityLabel={collection.title}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          locations={[0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View className="absolute inset-x-0 bottom-0 gap-1 p-4">
          <Text variant="label" className="text-white" numberOfLines={2}>
            {collection.title}
          </Text>
          <Text variant="caption" className="text-white/80" numberOfLines={1}>
            {collection.subtitle}
          </Text>
        </View>
      </Pressable>
    );
  }

  const heroWidth = Math.round(windowWidth - SCREEN_PADDING);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={collection.title}
      onPress={() => onPress(collection)}
      style={{ width: heroWidth }}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      <View style={{ height: HERO_HEIGHT }} className="bg-surfaceElevated">
        {collection.coverImage ? (
          <Image
            source={collection.coverImage}
            style={{ flex: 1 }}
            contentFit="cover"
            accessible
            accessibilityIgnoresInvertColors
            accessibilityLabel={collection.title}
          />
        ) : null}
      </View>

      <View className="gap-2 p-5">
        <Text
          variant="caption"
          tone="primary"
          className="font-bodySemibold uppercase tracking-widest"
        >
          {t('discover.roamSelection.badge')}
        </Text>
        <Text variant="h3" numberOfLines={2}>
          {collection.title}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={2}>
          {collection.subtitle}
        </Text>

        <View className="flex-row items-center gap-3 pt-1">
          <Text variant="caption" tone="secondary">
            {t('discover.roamSelection.places', { count: collection.experienceIds.length })}
          </Text>
          {collection.priceFromLabel ? (
            <Text variant="caption" tone="secondary">
              {collection.priceFromLabel}
            </Text>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center gap-1.5 self-start">
          <Text variant="label" tone="primary">
            {t('discover.roamSelection.cta')}
          </Text>
          <ArrowRight size={16} strokeWidth={2} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
