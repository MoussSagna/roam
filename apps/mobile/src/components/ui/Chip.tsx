import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';

import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  /** Optional leading icon/emoji (e.g. the Home "Selon ton humeur" chips). */
  icon?: ReactNode;
  className?: string;
};

export function Chip({ label, selected = false, icon, className, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cx(
        'min-h-10 flex-row items-center justify-center gap-1.5 rounded-pill border px-4 active:opacity-80',
        selected ? 'border-primary bg-primary' : 'border-border bg-surface',
        className,
      )}
      {...props}
    >
      {icon}
      <Text variant="small" tone={selected ? 'onPrimary' : 'default'} className="font-bodyMedium">
        {label}
      </Text>
    </Pressable>
  );
}
