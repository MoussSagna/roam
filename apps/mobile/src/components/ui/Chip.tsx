import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';

import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected?: boolean;
  className?: string;
};

export function Chip({ label, selected = false, className, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cx(
        'min-h-10 items-center justify-center rounded-pill border px-4 active:opacity-80',
        selected ? 'border-primary bg-primary' : 'border-border bg-surface',
        className,
      )}
      {...props}
    >
      <Text variant="small" tone={selected ? 'onPrimary' : 'default'} className="font-bodyMedium">
        {label}
      </Text>
    </Pressable>
  );
}
