import { View } from 'react-native';

import { Text } from '@/components/ui';

type JourneyProgressStepperProps = {
  /** One short label per step (its category, or its title). */
  labels: readonly string[];
  /** Steps before this index are done; this one is current. `-1` = not started yet. */
  currentIndex: number;
};

const DOT = 18;
/** Past this many steps the labels would be unreadable at phone width: dots only. */
const MAX_LABELLED_STEPS = 4;

/**
 * "Café —— Exposition —— Rooftop" over a journey's photo (sprint 11, the Parcours hub, after the
 * "Sortie en cours" reference): one ring per step joined by a line, the current one filled, done ones
 * solid. One equal column per step, so each label sits right under its dot. White on the photo's dark
 * gradient, like the other photo cards (`ImmersiveExperienceCard`). Decorative: the card states the
 * progress in words.
 */
export function JourneyProgressStepper({ labels, currentIndex }: JourneyProgressStepperProps) {
  const showLabels = labels.length <= MAX_LABELLED_STEPS;
  const lineClass = (reached: boolean) =>
    reached ? 'h-0.5 flex-1 bg-white' : 'h-0.5 flex-1 bg-white/40';

  return (
    <View
      className="flex-row"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {labels.map((label, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <View key={`${label}-${index}`} className="flex-1 items-center">
            <View className="w-full flex-row items-center">
              {index > 0 ? (
                <View className={lineClass(index <= currentIndex)} />
              ) : (
                <View className="flex-1" />
              )}
              <View
                testID={current ? 'journey-stepper-current' : undefined}
                style={{ width: DOT, height: DOT, borderRadius: DOT / 2 }}
                className={
                  done
                    ? 'items-center justify-center bg-white'
                    : 'items-center justify-center border-2 border-white'
                }
              >
                {current ? <View className="h-2 w-2 rounded-pill bg-white" /> : null}
              </View>
              {index < labels.length - 1 ? (
                <View className={lineClass(index < currentIndex)} />
              ) : (
                <View className="flex-1" />
              )}
            </View>
            {showLabels ? (
              <Text
                variant="caption"
                numberOfLines={1}
                className={
                  current ? 'mt-2 px-1 font-bodySemibold text-white' : 'mt-2 px-1 text-white/80'
                }
              >
                {label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
