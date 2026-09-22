import { MotiView } from 'moti';
import type { ComponentType } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';

type TileIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type MoodTileProps = {
  label: string;
  icon: TileIcon;
  /** Icon color when the tile is not selected (the mockup tints three of them). */
  iconColor: string;
  /** Icon color on the selected (dark) tile. */
  selectedIconColor: string;
  iconSize: number;
  selected: boolean;
  /** `warm` tiles get the peach background of the mockup (Festif, Romantique). */
  warm?: boolean;
  width: number;
  height: number;
  onPress: () => void;
};

/** One choice of the mood grid. Single choice: exposed as a radio. */
export function MoodTile({
  label,
  icon: Icon,
  iconColor,
  selectedIconColor,
  iconSize,
  selected,
  warm = false,
  width,
  height,
  onPress,
}: MoodTileProps) {
  return (
    <MotiView
      animate={{ scale: selected ? 1.03 : 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={{ width, height }}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        className={cx(
          'flex-1 items-center justify-center gap-[10px] rounded-large active:opacity-80',
          selected ? 'bg-primary' : warm ? 'bg-accent/[0.28]' : 'bg-text/[0.05]',
        )}
      >
        <Icon size={iconSize} strokeWidth={1.5} color={selected ? selectedIconColor : iconColor} />
        <Text variant="small" tone={selected ? 'onPrimary' : 'default'} style={{ fontSize: 14.5 }}>
          {label}
        </Text>
      </Pressable>
    </MotiView>
  );
}
