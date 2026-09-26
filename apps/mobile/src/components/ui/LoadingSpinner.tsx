import { useTranslation } from 'react-i18next';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type LoadingSpinnerProps = {
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The discreet loading indicator (a short wait; `Skeleton`s take over for a longer one): the platform spinner in the
 * theme's secondary text color, announced as "Chargement…" to screen readers. The system spinner already follows
 * the reduce-motion setting.
 */
export function LoadingSpinner({ size = 'small', style, testID }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ActivityIndicator
      testID={testID}
      size={size}
      color={colors.textSecondary}
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      style={style}
    />
  );
}
