import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/ui';

import { getHeroHeight } from '../lib/heroHeight';

/**
 * `HeroCarousel` while the experiences load: the same full-width block at the same height (`getHeroHeight`), with the
 * title and the button where they will be, so the page below does not move when the hero arrives.
 */
export function HeroSkeleton() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  return (
    <View
      testID="hero-skeleton"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      style={{ height: getHeroHeight(height) }}
    >
      <Skeleton style={{ flex: 1 }} />
      <View className="absolute bottom-16 left-6 right-6 gap-3">
        <Skeleton style={{ height: 32, width: '75%' }} className="rounded-pill opacity-60" />
        <Skeleton style={{ height: 16, width: '90%' }} className="rounded-pill opacity-60" />
        <Skeleton style={{ height: 48, width: 180 }} className="rounded-pill opacity-60" />
      </View>
    </View>
  );
}
