import type { LucideIcon } from 'lucide-react-native';
import Check from 'lucide-react-native/icons/check';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type ThemeOptionRowProps = {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * One row of "Thème" (`ThemeScreen`): icon, label, a checkmark when this is the active preference —
 * same shape and semantics as "Langue"'s `LanguageOptionRow` (`docs/DECISIONS.md` D-60), swapping the
 * flag emoji for a `LucideIcon` since a theme preference has no flag-like asset.
 */
export function ThemeOptionRow({ icon: Icon, label, selected, onPress }: ThemeOptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="h-9 w-9 items-center justify-center rounded-pill bg-primary/10">
        <Icon size={18} strokeWidth={1.8} color={colors.primary} />
      </View>

      <Text variant="body" className="flex-1 font-bodyMedium">
        {label}
      </Text>

      {selected ? <Check size={20} strokeWidth={2} color={colors.primary} /> : null}
    </Pressable>
  );
}
