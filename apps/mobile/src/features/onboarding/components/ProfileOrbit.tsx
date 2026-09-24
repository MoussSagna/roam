import Clock from 'lucide-react-native/icons/clock';
import Euro from 'lucide-react-native/icons/euro';
import Heart from 'lucide-react-native/icons/heart';
import MapPin from 'lucide-react-native/icons/map-pin';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { MotiView } from 'moti';
import { useEffect, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Logo } from '@/components/brand/Logo';
import { moodAccents, useTheme } from '@/theme';
import { brand, derived } from '@/theme/palette';

import { PROFILE_STAGE, RING_PROGRESS, type ProfileStage } from '../profileCreation';
import { RunnerIcon } from './RunnerIcon';

/** Everything is drawn on this grid (design points) and scaled to `size`. */
export const ORBIT_DESIGN_SIZE = 295;
const ORBIT_RADIUS = 127;
const CHIP_SIZE = 41;
const DISC_RADIUS = 74;
const RING_RADIUS = 81;
const RING_WIDTH = 2.5;
const LOGO_SIZE = 88;
/** The whole orbit turns this much while the profile is being analysed (a very slow drift). */
const ORBIT_DRIFT_DEGREES = 24;

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Chip = {
  id: string;
  icon: IconComponent;
  /** Angle on the orbit, in degrees, 0 = right, clockwise. */
  angle: number;
  tone: 'sage' | 'peach';
  color: 'primary' | 'text' | 'romantic' | 'festive';
};

/** What ROAM uses to build the profile: place, mood, time, budget, interests, activity. */
const CHIPS: readonly Chip[] = [
  { id: 'location', icon: MapPin, angle: -150, tone: 'sage', color: 'primary' },
  { id: 'mood', icon: Heart, angle: -90, tone: 'peach', color: 'romantic' },
  { id: 'time', icon: Clock, angle: -30, tone: 'sage', color: 'text' },
  { id: 'budget', icon: Euro, angle: 30, tone: 'peach', color: 'text' },
  { id: 'interests', icon: Sparkles, angle: 90, tone: 'sage', color: 'festive' },
  { id: 'activity', icon: RunnerIcon, angle: 150, tone: 'peach', color: 'primary' },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProfileOrbitProps = {
  size: number;
  stage: ProfileStage;
  reduceMotion: boolean;
  /** Ring pace per stage. Defaults to the onboarding's (~10 s); the journey building screen (sprint
   * 12, D-84) runs the same stages in about 3.5 s. */
  ringProgress?: Record<ProfileStage, { to: number; duration: number }>;
  /** Defaults to the onboarding's "Un instant…". */
  accessibilityLabel?: string;
};

/**
 * The centre piece of the profile creation: the ROAM mark in a disc, a loader ring that fills up and, around
 * it, six chips for the information ROAM uses. Only opacity/scale/rotation are animated (native driver).
 */
export function ProfileOrbit({
  size,
  stage,
  reduceMotion,
  ringProgress = RING_PROGRESS,
  accessibilityLabel,
}: ProfileOrbitProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const k = size / ORBIT_DESIGN_SIZE;
  const center = size / 2;
  const ringRadius = RING_RADIUS * k;
  const circumference = 2 * Math.PI * ringRadius;
  const analyzing = stage >= PROFILE_STAGE.analyzing;

  const progress = useSharedValue(0);
  useEffect(() => {
    const { to, duration } = ringProgress[stage];
    progress.value =
      reduceMotion || duration === 0
        ? to
        : withTiming(to, { duration, easing: Easing.inOut(Easing.quad) });
  }, [stage, reduceMotion, progress, ringProgress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    opacity: progress.value > 0.001 ? 1 : 0,
  }));
  const dotProps = useAnimatedProps(() => {
    const angle = progress.value * 2 * Math.PI - Math.PI / 2;
    return {
      cx: center + ringRadius * Math.cos(angle),
      cy: center + ringRadius * Math.sin(angle),
      opacity: progress.value > 0.001 ? 1 : 0,
    };
  });

  const sage = scheme === 'dark' ? colors.surfaceElevated : brand.sage;
  // Peach at about a third of its strength (RRGGBBAA), as on the mockup.
  const peach = `${colors.accent}55`;
  const iconColors = {
    primary: colors.primary,
    text: colors.text,
    romantic: moodAccents[scheme].romantic,
    festive: moodAccents[scheme].festive,
  };
  const drift = reduceMotion ? 0 : ORBIT_DRIFT_DEGREES;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? t('onboarding.profile.waiting')}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={ORBIT_RADIUS * k}
          fill="none"
          stroke={colors.textSecondary}
          strokeOpacity={0.45}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray={[0.1, 7]}
        />
      </Svg>

      <MotiView
        from={{ opacity: 0, scale: reduceMotion ? 1 : 0.85, translateY: reduceMotion ? 0 : 12 }}
        animate={{
          opacity: 1,
          scale: stage >= PROFILE_STAGE.done && !reduceMotion ? [1, 1.03, 1] : 1,
          translateY: 0,
        }}
        transition={{ type: 'timing', duration: stage >= PROFILE_STAGE.done ? 700 : 800 }}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 2 * DISC_RADIUS * k,
            height: 2 * DISC_RADIUS * k,
            borderRadius: DISC_RADIUS * k,
            backgroundColor: colors.surface,
            opacity: 0.85,
            shadowColor: derived.black,
            shadowOpacity: 0.07,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          }}
        />
        <Logo variant={scheme === 'dark' ? 'dark' : 'icon'} size={LOGO_SIZE * k} />
      </MotiView>

      <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          fill="none"
          stroke={colors.text}
          strokeOpacity={0.06}
          strokeWidth={RING_WIDTH}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={ringRadius}
          fill="none"
          stroke={colors.primary}
          strokeWidth={RING_WIDTH}
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
          rotation={-90}
          origin={`${center}, ${center}`}
          animatedProps={arcProps}
        />
        <AnimatedCircle r={6 * k} fill={colors.primary} animatedProps={dotProps} />
      </Svg>

      <MotiView
        animate={{ rotate: analyzing ? `${drift}deg` : '0deg' }}
        transition={{ type: 'timing', duration: 8000, easing: Easing.linear }}
        style={{ position: 'absolute', width: size, height: size }}
      >
        {CHIPS.map((chip, index) => {
          const radians = (chip.angle * Math.PI) / 180;
          const chipSize = CHIP_SIZE * k;
          const Icon = chip.icon;
          return (
            <MotiView
              key={chip.id}
              from={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 600, delay: 300 + index * 180 }}
              style={{
                position: 'absolute',
                left: center + ORBIT_RADIUS * k * Math.cos(radians) - chipSize / 2,
                top: center + ORBIT_RADIUS * k * Math.sin(radians) - chipSize / 2,
                width: chipSize,
                height: chipSize,
              }}
            >
              <MotiView
                animate={{ rotate: analyzing ? `${-drift}deg` : '0deg' }}
                transition={{ type: 'timing', duration: 8000, easing: Easing.linear }}
                style={{ flex: 1 }}
              >
                <MotiView
                  animate={{
                    scale: analyzing && !reduceMotion ? 1.07 : 1,
                    opacity: analyzing && !reduceMotion ? 0.82 : 1,
                  }}
                  transition={{
                    type: 'timing',
                    duration: 1600 + index * 140,
                    loop: analyzing && !reduceMotion,
                    repeatReverse: true,
                  }}
                  style={{
                    flex: 1,
                    borderRadius: chipSize / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: chip.tone === 'sage' ? sage : peach,
                    shadowColor: derived.black,
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                  }}
                >
                  <Icon size={20 * k} strokeWidth={1.75} color={iconColors[chip.color]} />
                </MotiView>
              </MotiView>
            </MotiView>
          );
        })}
      </MotiView>
    </View>
  );
}
