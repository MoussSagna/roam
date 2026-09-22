import { MotiView } from 'moti';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { cx } from '@/lib/cx';

type RowIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type ChoiceRowProps = {
  label: string;
  /** Spoken name when it differs from the visible label (e.g. the unit only shown as a glyph). */
  accessibilityLabel?: string;
  icon: RowIcon;
  /** Icon color when the row is not selected. */
  iconColor: string;
  /** Icon color on the selected (dark) row. */
  selectedIconColor: string;
  iconSize?: number;
  labelSize?: number;
  /** Icon centered in a slot of this width (default: the icon's own width), to align labels of smaller icons. */
  slotWidth?: number;
  paddingLeft?: number;
  selected: boolean;
  height: number;
  onPress: () => void;
};

/** Full-width single choice of an onboarding question (time, budget). Exposed as a radio. */
export function ChoiceRow({
  label,
  accessibilityLabel,
  icon: Icon,
  iconColor,
  selectedIconColor,
  iconSize = 45,
  labelSize = 17.5,
  slotWidth,
  paddingLeft = 20,
  selected,
  height,
  onPress,
}: ChoiceRowProps) {
  return (
    <MotiView
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={{ height }}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={{ paddingLeft }}
        className={cx(
          'flex-1 flex-row items-center gap-[17px] rounded-[16px] border pr-4 active:opacity-80',
          selected ? 'border-primary bg-primary' : 'border-border',
        )}
      >
        <View style={{ width: slotWidth, alignItems: 'center' }}>
          <Icon
            size={iconSize}
            strokeWidth={1.5}
            color={selected ? selectedIconColor : iconColor}
          />
        </View>
        <Text
          variant="bodyLg"
          tone={selected ? 'onPrimary' : 'default'}
          style={{ fontSize: labelSize }}
        >
          {label}
        </Text>
      </Pressable>
    </MotiView>
  );
}
