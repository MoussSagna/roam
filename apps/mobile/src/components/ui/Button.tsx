import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  className?: string;
};

export function Button({ label, variant = 'primary', disabled, className, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      // min-h-12 = 48px touch target
      className={cx(
        'min-h-12 items-center justify-center rounded-pill px-6 active:opacity-80',
        containerClasses[variant],
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <Text variant="label" tone={variant === 'primary' ? 'onPrimary' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}
