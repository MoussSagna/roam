import type { LucideIcon } from 'lucide-react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type ProfileMenuRowProps = {
  icon: LucideIcon;
  label: string;
  /** Short description under the label (e.g. "Humeur, budget, intérêts"). */
  subtitle?: string;
  /** Current value shown on the right (e.g. "Français", "Système"), instead of a subtitle. */
  value?: string;
  onPress: () => void;
  tone?: 'default' | 'error';
};

/**
 * One row of the profile menu (préférences/favoris/historique/statistiques, langue/thème,
 * aide/confidentialité). Reused across every group instead of a near-duplicate per section.
 */
export function ProfileMenuRow({
  icon: Icon,
  label,
  subtitle,
  value,
  onPress,
  tone = 'default',
}: ProfileMenuRowProps) {
  const { colors } = useTheme();
  const isError = tone === 'error';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary/10">
        <Icon size={19} strokeWidth={1.8} color={isError ? colors.error : colors.primary} />
      </View>

      <View className="flex-1">
        <Text variant="body" tone={isError ? 'error' : 'default'} className="font-bodyMedium">
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="small" tone="secondary">
          {value}
        </Text>
      ) : null}

      {!isError ? <ChevronRight size={18} strokeWidth={1.8} color={colors.textSecondary} /> : null}
    </Pressable>
  );
}
