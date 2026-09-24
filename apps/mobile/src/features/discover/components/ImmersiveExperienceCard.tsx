import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { Experience } from '@/types';

type ImmersiveExperienceCardProps = {
  experience: Experience;
  onPress: (experience: Experience) => void;
};

const CARD_HEIGHT = 320;

/**
 * Discover's second immersive editorial block (sprint 6 brief §"Section 3"): a single fixed card, not
 * a carousel — the FlatList rule (`docs/DEVELOPMENT.md` -> "Horizontal lists / carousels") only applies
 * to repeating data lists. Editorial headline/subtitle are static copy (`discover.immersive.*`), kept
 * independent from whichever experience is picked underneath (`pickImmersiveExperience`) so the section
 * reads as a standing "night out" invitation rather than one specific place's own description.
 *
 * A plain `View`, not an outer `Pressable`, around the CTA `Button` — same "no nested touchables"
 * shape as Home's own `HeroCarousel` slides.
 */
export function ImmersiveExperienceCard({ experience, onPress }: ImmersiveExperienceCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{ height: CARD_HEIGHT }}
      className="overflow-hidden rounded-hero bg-surfaceElevated"
    >
      {experience.coverImage ? (
        <Image
          source={experience.coverImage}
          style={{ flex: 1 }}
          contentFit="cover"
          accessible
          accessibilityIgnoresInvertColors
          accessibilityLabel={experience.title}
        />
      ) : null}

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View className="absolute inset-x-0 bottom-0 gap-2 p-6">
        <Text
          variant="caption"
          className="font-bodySemibold uppercase tracking-widest text-white/80"
        >
          {t('discover.immersive.eyebrow')}
        </Text>
        <Text variant="h2" className="text-white" numberOfLines={2}>
          {t('discover.immersive.title')}
        </Text>
        <Text variant="body" className="text-white/90" numberOfLines={2}>
          {t('discover.immersive.subtitle')}
        </Text>
        <Button
          label={t('discover.immersive.cta')}
          variant="secondary"
          onPress={() => onPress(experience)}
          className="mt-2 min-h-14 self-start px-6"
        />
      </View>
    </View>
  );
}
