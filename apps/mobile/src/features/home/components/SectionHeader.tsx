import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type SectionHeaderProps = {
  title: string;
  onSeeAll?: () => void;
};

/** Title + "Voir tout" link, shared by every Home section (moods, popular, nearby, for you). */
export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center justify-between">
      {/* Not `accessibilityRole="header"`: the hero's experience title is the screen's one heading. */}
      <Text variant="h3">{title}</Text>
      {onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.seeAll')}
          onPress={onSeeAll}
          hitSlop={8}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Text variant="small" tone="primary" className="font-bodyMedium">
            {t('common.seeAll')}
          </Text>
          <ArrowRight size={14} strokeWidth={2} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
