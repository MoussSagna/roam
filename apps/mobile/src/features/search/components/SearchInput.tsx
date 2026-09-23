import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  placeholder: string;
  autoFocus?: boolean;
};

/**
 * Search's own live text field — visually the same pill as `components/ui/SearchBar`, but an actual
 * `TextInput` (`SearchBar` is a `Pressable` entry point only, used by Home/Discover to *open* this
 * screen). Trailing "×" clears the query, shown only once there is text (Sprint 6 brief §6).
 */
export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder,
  autoFocus,
}: SearchInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="min-h-14 flex-row items-center gap-3 rounded-pill border border-border bg-surface px-4">
      <Search size={20} strokeWidth={1.8} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        className="flex-1 font-body text-body text-text"
        style={{ paddingVertical: 0 }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.clearQuery')}
          onPress={onClear}
          hitSlop={8}
        >
          <X size={18} strokeWidth={1.8} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
