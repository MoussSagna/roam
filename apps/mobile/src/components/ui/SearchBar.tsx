import Search from 'lucide-react-native/icons/search';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import { Pressable, type PressableProps } from 'react-native';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type SearchBarProps = Omit<PressableProps, 'children'> & {
  placeholder: string;
  /** Accessibility label of the trailing filter button. */
  filterLabel: string;
  onPressFilter?: () => void;
  className?: string;
};

/**
 * Reusable search entry point (Home, and later Discover): a mocked search field — no real query
 * engine in this sprint (`08_AGENT_TODO.md` Phase B) — plus a filter button, both currently no-ops.
 */
export function SearchBar({
  placeholder,
  filterLabel,
  onPressFilter,
  className,
  ...props
}: SearchBarProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="search"
      className={cx(
        'min-h-14 flex-row items-center gap-3 rounded-pill border border-border bg-surface px-4',
        className,
      )}
      {...props}
    >
      <Search size={20} strokeWidth={1.8} color={colors.textSecondary} />
      <Text variant="body" tone="secondary" className="flex-1" numberOfLines={1}>
        {placeholder}
      </Text>
      <IconButton
        icon={SlidersHorizontal}
        accessibilityLabel={filterLabel}
        variant="ghost"
        size={36}
        onPress={onPressFilter}
      />
    </Pressable>
  );
}
