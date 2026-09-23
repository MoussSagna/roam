import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ExperienceMapCard } from './components/ExperienceMapCard';
import { RoamMap } from './components/RoamMap';
import { useNearbyMapExperiences } from './hooks/useNearbyMapExperiences';

/**
 * The Map screen (`03_UX_SCREENS_AND_FLOWS.md` §12, `08_AGENT_TODO.md` Phase B), reached from Discover's
 * "Voir la carte". First real map of the sprint 7 replacement (D-70): `RoamMap` (`react-native-maps`)
 * over the mocked "Près de toi" pool. Tapping a pin opens the shared bottom card, whose "Voir le lieu"
 * pushes the experience detail. Search now has its own full-screen `RoamMap` too (sprint 8, D-71), over
 * its own filtered/sorted results instead of this screen's fixed "Près de toi" pool.
 */
export function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isLoading, markers, selectedExperience, toggleSelected, clearSelection } =
    useNearbyMapExperiences();

  const goToExperience = useCallback(
    (experience: Experience) => {
      router.push({ pathname: '/experience/[id]', params: { id: experience.id } });
    },
    [router],
  );

  return (
    <Screen className="gap-6 pt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
        hitSlop={12}
        className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
      >
        <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
      </Pressable>

      <View className="gap-2">
        <Text variant="h2" accessibilityRole="header">
          {t('map.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text variant="body" tone="secondary">
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <RoamMap
            markers={markers}
            selectedMarkerId={selectedExperience?.id ?? null}
            onPressMarker={toggleSelected}
            onPressMap={clearSelection}
          />
          {selectedExperience ? (
            <ExperienceMapCard
              experience={selectedExperience}
              onPressView={goToExperience}
              onClose={clearSelection}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
