import Check from 'lucide-react-native/icons/check';
import { MotiView } from 'moti';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { ProfileChecklist } from './components/ProfileChecklist';
import { ORBIT_DESIGN_SIZE, ProfileOrbit } from './components/ProfileOrbit';
import { ProfileScene } from './components/ProfileScene';
import { useOnboardingNavigation } from './onboardingFlow';
import { PROFILE_STAGE, useProfileCreation } from './profileCreation';

const SIDE_MARGIN = 21;
const CARD_WIDTH = 287;
/** Height reserved for the orbit (its 295 pt plus the overhang of the chips); it shrinks on short screens. */
const ORBIT_AREA_HEIGHT = 296;
const ORBIT_AREA_MIN_HEIGHT = 200;

/** Fade + small rise, delayed; the rise is dropped when the user asked for reduced motion. */
function Reveal({
  delay = 0,
  visible = true,
  reduceMotion,
  children,
}: {
  delay?: number;
  visible?: boolean;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: reduceMotion ? 0 : 12 }}
      animate={{ opacity: visible ? 1 : 0, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay }}
    >
      {children}
    </MotiView>
  );
}

/**
 * Onboarding — "On crée ton profil sur mesure": an animated waiting screen between the interests and
 * "Prêt à explorer ?". It is a SIMULATION for the prototype (no backend, no request, nothing saved): a
 * ~10 s front-end timeline (`profileCreation.ts`) drives the animations, then the screen replaces itself
 * with the next step. There is nothing to press.
 */
export function ProfileCreationScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const { replaceWithNext } = useOnboardingNavigation('profile');
  const stage = useProfileCreation(replaceWithNext);
  const [orbitAreaHeight, setOrbitAreaHeight] = useState<number>(ORBIT_AREA_HEIGHT);

  // The orbit takes the height left by the texts (never more than its design size).
  const orbitSize = Math.max(190, Math.min(ORBIT_DESIGN_SIZE, orbitAreaHeight, width - 40));
  const done = stage >= PROFILE_STAGE.done;
  const cardMargin = Math.max(24, (width - CARD_WIDTH) / 2);

  return (
    <MotiView
      animate={{
        opacity: stage >= PROFILE_STAGE.leaving ? 0 : 1,
        translateY: stage >= PROFILE_STAGE.leaving && !reduceMotion ? -10 : 0,
      }}
      transition={{ type: 'timing', duration: 300 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ProfileScene width={width} />

      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: SIDE_MARGIN,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <RNText
          accessibilityRole="header"
          className="text-text"
          style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 22, lineHeight: 32 }}
        >
          {t('brand.name')}
        </RNText>
        <Reveal delay={200} reduceMotion={reduceMotion}>
          <Text variant="small" tone="secondary">
            {t('onboarding.profile.waiting')}
          </Text>
        </Reveal>
      </View>

      <View
        className="items-center justify-center"
        style={{ height: ORBIT_AREA_HEIGHT, minHeight: ORBIT_AREA_MIN_HEIGHT, flexShrink: 1 }}
        onLayout={(e) => setOrbitAreaHeight(e.nativeEvent.layout.height)}
      >
        <ProfileOrbit size={orbitSize} stage={stage} reduceMotion={reduceMotion} />
      </View>

      <View>
        <Reveal delay={900} reduceMotion={reduceMotion}>
          <RNText
            className="text-text"
            style={{
              textAlign: 'center',
              marginHorizontal: SIDE_MARGIN,
              fontFamily: fontFamily.editorialSemibold,
              fontSize: 29,
              lineHeight: 36,
            }}
          >
            {t('onboarding.profile.title')}
          </RNText>
        </Reveal>
        <Reveal delay={1100} reduceMotion={reduceMotion}>
          <Text
            variant="small"
            tone="secondary"
            style={{
              textAlign: 'center',
              marginTop: 3,
              marginHorizontal: SIDE_MARGIN,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {t('onboarding.profile.subtitle')}
          </Text>
        </Reveal>

        <View style={{ marginTop: 19, marginHorizontal: cardMargin }}>
          <ProfileChecklist stage={stage} reduceMotion={reduceMotion} />
        </View>

        <View style={{ height: 26, marginTop: 2, alignItems: 'center', justifyContent: 'center' }}>
          <MotiView
            animate={{ opacity: done ? 0 : 1 }}
            transition={{ type: 'timing', duration: 400 }}
            style={{
              position: 'absolute',
              width: 34,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.primary,
            }}
          />
          <MotiView
            accessibilityLiveRegion="polite"
            animate={{ opacity: done ? 1 : 0, translateY: done || reduceMotion ? 0 : 6 }}
            transition={{ type: 'timing', duration: 450 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View
              className="items-center justify-center rounded-pill bg-primary"
              style={{ width: 20, height: 20 }}
            >
              <Check size={12} strokeWidth={3} color={colors.primaryForeground} />
            </View>
            <Text variant="small" className="font-bodyMedium" style={{ fontSize: 14.5 }}>
              {t('onboarding.profile.ready')}
            </Text>
          </MotiView>
        </View>

        <MotiView
          animate={{ opacity: stage >= PROFILE_STAGE.thirdStep ? 0.75 : 0 }}
          transition={{ type: 'timing', duration: 900 }}
          style={{ marginTop: 6, minHeight: 70, justifyContent: 'center' }}
        >
          <RNText
            accessible={false}
            style={{
              textAlign: 'center',
              color: colors.primary,
              fontFamily: fontFamily.script,
              fontSize: 31,
              lineHeight: 35,
              transform: [{ rotate: '-8deg' }],
            }}
          >
            {t('onboarding.profile.script')}
          </RNText>
        </MotiView>
      </View>
      <View style={{ flex: 1, minHeight: Math.max(insets.bottom, 16) }} />
    </MotiView>
  );
}
