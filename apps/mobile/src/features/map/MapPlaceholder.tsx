import { useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useHomeExperiences } from '@/features/home/useHomeExperiences';
import { pickNearby } from '@/features/discover/lib/pickNearby';
import { useTheme } from '@/theme';
import type { Experience } from '@/types';

import { ExperienceMapView } from './ExperienceMapView';

/**
 * The Map screen (`03_UX_SCREENS_AND_FLOWS.md` §12, `08_AGENT_TODO.md` Phase B) — upgraded in sprint 6
 * from a "coming soon" stand-in to `ExperienceMapView` over a small nearby pool (`pickNearby`, the
 * same rule Discover's own "Près de toi" uses), reached from Discover's "Voir la carte". Search's own
 * Liste/Carte toggle renders `ExperienceMapView` inline instead of navigating here (it needs an
 * arbitrary filtered result set, which this route has no way to receive through serializable params) —
 * one shared map component, not two parallel map systems.
 */
export function MapPlaceholder() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { experiences } = useHomeExperiences();
  const nearbyExperiences = useMemo(() => pickNearby(experiences), [experiences]);

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

      <ExperienceMapView experiences={nearbyExperiences} onPressExperience={goToExperience} />
    </Screen>
  );
}
