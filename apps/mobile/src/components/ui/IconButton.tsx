import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

type IconButtonVariant = 'surface' | 'ghost';

const containerClasses: Record<IconButtonVariant, string> = {
  surface: 'bg-surface border border-border',
  ghost: 'bg-transparent',
};

export type IconButtonProps = Omit<PressableProps, 'children'> & {
  icon: LucideIcon;
  /** Required: an icon-only control must still announce what it does. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  iconColor?: string;
  className?: string;
};

/**
 * Icon-only, circular pressable (documented in `06_DESIGN_SYSTEM.md` as a Core component, not yet
 * built before sprint 5). Used for the notification bell, the search filter button and the favorite
 * toggle on experience cards.
 */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  variant = 'surface',
  size = 44,
  iconColor,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      className={cx(
        'items-center justify-center rounded-pill active:opacity-80',
        containerClasses[variant],
        disabled && 'opacity-50',
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon size={size * 0.45} strokeWidth={1.8} color={iconColor ?? colors.text} />
    </Pressable>
  );
}
