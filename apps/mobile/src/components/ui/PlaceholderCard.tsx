import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { cx } from '@/lib/cx';

import { Text } from './Text';

type PlaceholderCardProps = {
  index: number;
  className?: string;
};

/** Filler block for screens that only need scrollable placeholder content (`08_AGENT_TODO.md` Phase B). */
export function PlaceholderCard({ index, className }: PlaceholderCardProps) {
  const { t } = useTranslation();

  return (
    <View
      className={cx(
        'h-28 justify-center rounded-card border border-border bg-surface px-5',
        className,
      )}
    >
      <Text variant="label">{t('common.placeholder', { index })}</Text>
    </View>
  );
}
