import { MotiView } from 'moti';
import Check from 'lucide-react-native/icons/check';
import { View } from 'react-native';

import { useTheme } from '@/theme';

const RING_SIZE = 96;
const BADGE_SIZE = 72;

type SuccessCheckmarkProps = {
  /** Drops the pulse/spring/scale, keeping only a fade — `useReduceMotion()` at the call site. */
  reduceMotion?: boolean;
};

/**
 * The success badge of the reset-success screen (design mockup "Authentification", tile 7): a
 * filled circle with a checkmark inside a thin outline ring. Not static — on mount, a soft ring
 * pulses out once behind it while the badge springs in and the check fades in a beat after, a
 * small "success ping" (requested as a nice-to-have, kept to a single pulse, no loop, per the
 * project's "subtle motion" rule — `DECISIONS.md` D-36).
 */
export function SuccessCheckmark({ reduceMotion = false }: SuccessCheckmarkProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!reduceMotion && (
        <MotiView
          from={{ opacity: 0.5, scale: 0.7 }}
          animate={{ opacity: 0, scale: 1.55 }}
          transition={{ type: 'timing', duration: 900, delay: 150 }}
          style={{
            position: 'absolute',
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 1.5,
            borderColor: colors.primary,
          }}
        />
      )}

      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderWidth: 1.5,
          borderColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MotiView
          from={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={
            reduceMotion
              ? { type: 'timing', duration: 300 }
              : { type: 'spring', damping: 11, stiffness: 170, delay: 80 }
          }
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: BADGE_SIZE / 2,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MotiView
            from={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 220, delay: reduceMotion ? 150 : 320 }}
          >
            <Check size={32} strokeWidth={3} color={colors.primaryForeground} />
          </MotiView>
        </MotiView>
      </View>
    </View>
  );
}
