import type { LucideIcon } from 'lucide-react-native';
import Check from 'lucide-react-native/icons/check';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type SortOptionRowProps = {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
};

/** One row of `SearchSortSheet`: icon, label, a checkmark when active. Same radio-row shape as
 * `LanguageOptionRow`/`ThemeOptionRow` (`features/profile/components/`) — reused here rather than a
 * third near-identical row component, just with a Lucide icon instead of a flag/swatch. */
export function SortOptionRow({ label, icon: Icon, selected, onPress }: SortOptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="h-9 w-9 items-center justify-center rounded-pill bg-surfaceElevated">
        <Icon size={18} strokeWidth={1.8} color={colors.text} />
      </View>

      <Text variant="body" className="flex-1 font-bodyMedium">
        {label}
      </Text>

      {selected ? <Check size={20} strokeWidth={2} color={colors.primary} /> : null}
    </Pressable>
  );
}
