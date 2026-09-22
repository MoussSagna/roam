import { MotiView } from 'moti';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';

type TileIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type InterestTileProps = {
  label: string;
  icon: TileIcon;
  iconColor: string;
  /** Icon color on the selected (dark) tile. */
  selectedIconColor: string;
  /** Size of the icon box: it keeps the label at the same place whatever the glyph. */
  iconSize: number;
  /** Draws the glyph larger than its box, for icons that fill less of it than Lucide's. */
  iconScale?: number;
  selected: boolean;
  width: number;
  height: number;
  onPress: () => void;
};

/** One choice of the interests grid. Several can be selected: exposed as a checkbox. */
export function InterestTile({
  label,
  icon: Icon,
  iconColor,
  selectedIconColor,
  iconSize,
  iconScale = 1,
  selected,
  width,
  height,
  onPress,
}: InterestTileProps) {
  return (
    <MotiView
      animate={{ scale: selected ? 1.03 : 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={{ width, height }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        className={cx(
          'flex-1 items-center justify-center gap-[9px] rounded-[16px] border active:opacity-80',
          selected ? 'border-primary bg-primary' : 'border-border',
        )}
      >
        <View
          style={{
            width: iconSize,
            height: iconSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            size={iconSize * iconScale}
            strokeWidth={1.5}
            color={selected ? selectedIconColor : iconColor}
          />
        </View>
        <Text
          variant="small"
          tone={selected ? 'onPrimary' : 'default'}
          style={{ fontSize: 15.5 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </MotiView>
  );
}
