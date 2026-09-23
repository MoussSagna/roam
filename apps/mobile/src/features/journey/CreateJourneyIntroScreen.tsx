import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, FadeInUp, Text } from '@/components/ui';
import { fontFamily } from '@/theme/typography';

import { JourneyFlowHeader } from './components/JourneyFlowHeader';
import { useJourneyExperiences } from './hooks/useJourneyExperiences';
import { useLeaveCreation } from './hooks/useLeaveCreation';

/**
 * Journey creation 1/6 — intro (`/journey/create`, sprint 10). No form: an editorial collage of three
 * experience photos from the existing pool (no new asset), the promise, and "Commencer".
 */
export function CreateJourneyIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { experiences } = useJourneyExperiences();
  const { requestLeave, quitModal } = useLeaveCreation();

  const covers = useMemo(
    () =>
      experiences
        .filter((experience) => experience.coverImage)
        .sort((a, b) => Number(!!b.isHero) - Number(!!a.isHero))
        .slice(0, 3)
        .map((experience) => experience.coverImage!),
    [experiences],
  );

  const collageHeight = Math.min(360, height * 0.42);
  const bigWidth = (width - 48) * 0.58;
  const smallWidth = (width - 48) * 0.38;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 px-6">
          <JourneyFlowHeader onBack={requestLeave} />

          <View testID="journey-intro-collage" style={{ height: collageHeight }} className="mt-2">
            {covers[0] ? (
              <FadeInUp style={{ position: 'absolute', left: 0, top: 0 }}>
                <View
                  className="overflow-hidden rounded-hero bg-surfaceElevated"
                  style={{
                    width: bigWidth,
                    height: collageHeight,
                    transform: [{ rotate: '-2deg' }],
                  }}
                >
                  <Image source={covers[0]} style={{ flex: 1 }} contentFit="cover" />
                </View>
              </FadeInUp>
            ) : null}
            {covers[1] ? (
              <FadeInUp delay={120} style={{ position: 'absolute', right: 0, top: 12 }}>
                <View
                  className="overflow-hidden rounded-card bg-surfaceElevated"
                  style={{
                    width: smallWidth,
                    height: collageHeight * 0.46,
                    transform: [{ rotate: '3deg' }],
                  }}
                >
                  <Image source={covers[1]} style={{ flex: 1 }} contentFit="cover" />
                </View>
              </FadeInUp>
            ) : null}
            {covers[2] ? (
              <FadeInUp delay={240} style={{ position: 'absolute', right: 0, bottom: 0 }}>
                <View
                  className="overflow-hidden rounded-card bg-surfaceElevated"
                  style={{
                    width: smallWidth,
                    height: collageHeight * 0.46,
                    transform: [{ rotate: '-3deg' }],
                  }}
                >
                  <Image source={covers[2]} style={{ flex: 1 }} contentFit="cover" />
                </View>
              </FadeInUp>
            ) : null}
          </View>

          <FadeInUp delay={200} style={{ marginTop: 28, gap: 10 }}>
            <Text variant="caption" tone="primary" className="uppercase tracking-[2px]">
              {t('journey.intro.eyebrow')}
            </Text>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 36, lineHeight: 40 }}
              className="text-text"
            >
              {t('journey.intro.title')}
            </Text>
            <Text variant="bodyLg" tone="secondary">
              {t('journey.intro.subtitle')}
            </Text>
          </FadeInUp>

          <View className="flex-1" />

          <View className="gap-3 pb-4">
            <Button
              label={t('journey.intro.start')}
              trailingIcon={ArrowRight}
              onPress={() => router.push('/journey/create/context')}
            />
            <Button label={t('journey.intro.cancel')} variant="secondary" onPress={requestLeave} />
          </View>
        </View>
      </SafeAreaView>
      {quitModal}
    </View>
  );
}
