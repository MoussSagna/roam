import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  destructive: 'bg-error',
};

/** `primary` and `destructive` both sit on a saturated background and need the same light label/icon
 * color; only `secondary` reads with the default text tone. */
const NEEDS_LIGHT_CONTENT: Record<ButtonVariant, boolean> = {
  primary: true,
  secondary: false,
  destructive: true,
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  /** Icon shown before the label (e.g. a provider logo for "Continue with…"). */
  leadingIcon?: ReactNode;
  /** Icon shown after the label (e.g. an arrow for "Next"). */
  trailingIcon?: LucideIcon;
  /** Shows a spinner instead of the label/icons and disables the press, for a simulated request. */
  loading?: boolean;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  leadingIcon,
  trailingIcon: TrailingIcon,
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const needsLightContent = NEEDS_LIGHT_CONTENT[variant];
  const isDisabled = !!disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      // min-h-16 = 64px: comfortably above the 48px touch target
      className={cx(
        'min-h-16 flex-row items-center justify-center gap-4 rounded-large px-6 active:opacity-80',
        containerClasses[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={needsLightContent ? colors.primaryForeground : colors.text} />
      ) : (
        <>
          {leadingIcon}
          <Text variant="cta" tone={needsLightContent ? 'onPrimary' : 'default'}>
            {label}
          </Text>
          {TrailingIcon ? (
            <TrailingIcon
              size={28}
              strokeWidth={1.5}
              color={needsLightContent ? colors.primaryForeground : colors.text}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}
