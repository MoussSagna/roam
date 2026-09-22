import { Image } from 'expo-image';
import { Pressable, type ImageSourcePropType } from 'react-native';

import { cx } from '@/lib/cx';

export const THUMB_SIZE = 56;
export const THUMB_GAP = 8;

type GalleryThumbnailProps = {
  source: ImageSourcePropType;
  index: number;
  active: boolean;
  label: string;
  onPress: (index: number) => void;
};

/** One thumbnail in the gallery's bottom strip (sprint 5 §11) — a clear border marks the selected one. */
export function GalleryThumbnail({ source, index, active, label, onPress }: GalleryThumbnailProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => onPress(index)}
      style={{ width: THUMB_SIZE, height: THUMB_SIZE, marginRight: THUMB_GAP }}
      className={cx(
        'overflow-hidden rounded-medium border-2',
        active ? 'border-white' : 'border-white/30',
      )}
    >
      <Image
        source={source}
        style={{ flex: 1 }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}
