import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  /** Icon shown after the label (e.g. an arrow for "Next"). */
  trailingIcon?: LucideIcon;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  trailingIcon: TrailingIcon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      // min-h-16 = 64px: comfortably above the 48px touch target
      className={cx(
        'min-h-16 flex-row items-center justify-center gap-4 rounded-large px-6 active:opacity-80',
        containerClasses[variant],
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <Text variant="cta" tone={isPrimary ? 'onPrimary' : 'default'}>
        {label}
      </Text>
      {TrailingIcon ? (
        <TrailingIcon
          size={28}
          strokeWidth={1.5}
          color={isPrimary ? colors.primaryForeground : colors.text}
        />
      ) : null}
    </Pressable>
  );
}
