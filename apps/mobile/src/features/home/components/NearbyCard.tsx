import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';

import type { NearbyCategory } from '../data/nearbyCategories';

const TILE_SIZE = 84;

type NearbyCardProps = {
  category: NearbyCategory;
  onPress: (category: NearbyCategory) => void;
};

/** "Lieux proches de toi" tile: a round photo shortcut plus its category label. */
export function NearbyCard({ category, onPress }: NearbyCardProps) {
  const { t } = useTranslation();
  const label = t(category.labelKey);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(category)}
      className="items-center gap-2 active:opacity-80"
      style={{ width: TILE_SIZE + 8 }}
    >
      <Image
        source={category.image}
        style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: TILE_SIZE / 2 }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      <Text variant="small" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
