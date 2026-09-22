import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';

type WantMoreCtaProps = {
  onPress: () => void;
};

/** Final "Envie d'en faire plus ?" block (sprint 5 §24) — same destination as the primary CTA
 * (`/itinerary/create`), not a second flow. */
export function WantMoreCta({ onPress }: WantMoreCtaProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3 rounded-card border border-border bg-surfaceElevated p-4">
      <Text variant="h4">{t('experience.wantMore.title')}</Text>
      <Text variant="body" tone="secondary">
        {t('experience.wantMore.body')}
      </Text>
      <Button label={t('experience.wantMore.cta')} onPress={onPress} />
    </View>
  );
}
