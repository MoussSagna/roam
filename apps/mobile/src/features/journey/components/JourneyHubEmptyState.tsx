import { Image } from 'expo-image';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Route from 'lucide-react-native/icons/route';
import { useTranslation } from 'react-i18next';
import { type ImageSourcePropType, View } from 'react-native';

import { Button, FadeInUp, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

type JourneyHubEmptyStateProps = {
  /** Up to three experience photos from the existing pool (no dedicated asset). */
  covers: readonly ImageSourcePropType[];
  onCreate: () => void;
};

const CARD_W = 128;
const CARD_H = 168;
const BADGE = 56;

/** Left, right, then center (drawn last, on top). */
const FAN = [
  { rotate: '-9deg', translateX: -78, translateY: 14 },
  { rotate: '9deg', translateX: 78, translateY: 14 },
  { rotate: '0deg', translateX: 0, translateY: 0 },
] as const;

/**
 * The Parcours hub with nothing to show yet — no journey in progress, none completed (sprint 11). Not
 * a bare empty list: three fanned photos around the route mark, the promise, the three moments of a
 * journey, and "Créer mon parcours" (→ the existing `/journey/create` flow).
 */
export function JourneyHubEmptyState({ covers, onCreate }: JourneyHubEmptyStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fanned = [covers[1], covers[2], covers[0]];
  const steps = [
    t('journey.hub.emptyStepMood'),
    t('journey.hub.emptyStepPlan'),
    t('journey.hub.emptyStepGo'),
  ];

  return (
    <View testID="journey-hub-empty" className="gap-8">
      <View className="items-center justify-center" style={{ height: CARD_H + 48 }}>
        {FAN.map((pose, index) => (
          <FadeInUp key={pose.rotate} delay={index * 120} style={{ position: 'absolute', top: 8 }}>
            <View
              className="overflow-hidden rounded-card border-4 border-surface bg-surfaceElevated"
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: [
                  { translateX: pose.translateX },
                  { translateY: pose.translateY },
                  { rotate: pose.rotate },
                ],
              }}
            >
              {fanned[index] ? (
                <Image source={fanned[index]} style={{ flex: 1 }} contentFit="cover" />
              ) : null}
            </View>
          </FadeInUp>
        ))}
        <FadeInUp delay={360} style={{ position: 'absolute', bottom: 0 }}>
          <View
            className="items-center justify-center rounded-pill border-4 border-background bg-primary"
            style={{ width: BADGE, height: BADGE }}
          >
            <Route size={24} strokeWidth={1.8} color={colors.primaryForeground} />
          </View>
        </FadeInUp>
      </View>

      <FadeInUp delay={200} style={{ gap: 10 }}>
        <Text
          accessibilityRole="header"
          className="text-center text-text"
          style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 30, lineHeight: 36 }}
        >
          {t('journey.hub.emptyTitle')}
        </Text>
        <Text variant="bodyLg" tone="secondary" className="text-center">
          {t('journey.hub.emptySubtitle')}
        </Text>
      </FadeInUp>

      <FadeInUp delay={300} style={{ gap: 12 }}>
        {steps.map((label, index) => (
          <View key={label} className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-pill bg-primary/10">
              <Text variant="label" tone="primary">
                {index + 1}
              </Text>
            </View>
            <Text variant="body" className="flex-1">
              {label}
            </Text>
          </View>
        ))}
      </FadeInUp>

      <FadeInUp delay={400}>
        <Button label={t('journey.hub.emptyCta')} trailingIcon={ArrowRight} onPress={onCreate} />
      </FadeInUp>
    </View>
  );
}
