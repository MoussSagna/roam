import type { LucideIcon } from 'lucide-react-native';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Masks the value and shows a toggle to reveal it (e.g. a password field). */
  secureTextEntry?: boolean;
  /** Accessible labels for the show/hide toggle. Required when `secureTextEntry` is set. */
  showLabel?: string;
  hideLabel?: string;
  className?: string;
};

/**
 * Labeled input with a leading icon (Email, Mot de passe…), matching the auth screens' fields.
 * `secureTextEntry` adds a show/hide toggle instead of just masking the value.
 */
export function TextField({
  label,
  icon: Icon,
  error,
  secureTextEntry,
  showLabel,
  hideLabel,
  className,
  ...props
}: TextFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const masked = !!secureTextEntry && !visible;

  return (
    <View className={className}>
      <Text variant="small" tone="secondary" style={{ marginBottom: 6 }}>
        {label}
      </Text>
      <View
        className={cx(
          'min-h-16 flex-row items-center gap-3 rounded-medium border bg-surface px-4',
          error ? 'border-error' : 'border-border',
        )}
      >
        <Icon size={20} strokeWidth={1.5} color={error ? colors.error : colors.textSecondary} />
        <TextInput
          accessibilityLabel={label}
          {...props}
          secureTextEntry={masked}
          placeholderTextColor={colors.textSecondary}
          className="flex-1 font-body text-body text-text"
          style={{ paddingVertical: 0 }}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? hideLabel : showLabel}
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
          >
            {visible ? (
              <EyeOff size={20} strokeWidth={1.5} color={colors.textSecondary} />
            ) : (
              <Eye size={20} strokeWidth={1.5} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" tone="error" style={{ marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
