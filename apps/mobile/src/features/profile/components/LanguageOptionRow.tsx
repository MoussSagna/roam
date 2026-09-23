import Check from 'lucide-react-native/icons/check';
import { Pressable, Text as RNText, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { LanguageOption } from '@/i18n';

type LanguageOptionRowProps = {
  option: LanguageOption;
  selected: boolean;
  onPress: (code: LanguageOption['code']) => void;
};

/**
 * One row of "Langue" (`LanguageScreen`): flag (decorative), native name, a checkmark when this is
 * the active language. `accessibilityRole="radio"` — single choice, same semantics as onboarding's
 * `MoodTile` radiogroup (`docs/DECISIONS.md` D-21). The flag is a plain Unicode emoji, not an asset
 * or a new dependency: purely decorative, `option.code` carries the actual meaning.
 */
export function LanguageOptionRow({ option, selected, onPress }: LanguageOptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={option.nativeName}
      onPress={() => onPress(option.code)}
      className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-70"
    >
      {option.flag ? (
        <RNText accessible={false} style={{ fontSize: 22 }}>
          {option.flag}
        </RNText>
      ) : (
        <View className="h-6 w-6" />
      )}

      <Text variant="body" className="flex-1 font-bodyMedium">
        {option.nativeName}
      </Text>

      {selected ? <Check size={20} strokeWidth={2} color={colors.primary} /> : null}
    </Pressable>
  );
}
