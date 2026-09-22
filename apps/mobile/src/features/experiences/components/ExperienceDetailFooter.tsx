import Sparkles from 'lucide-react-native/icons/sparkles';
import { MotiView } from 'moti';
import { View } from 'react-native';

import { Button } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/** Approximate rendered height of the footer (button + its own paddings), used by the screen to keep
 * the `ScrollView`'s last section clear of the floating bar (item 18). */
export const FOOTER_CLEARANCE = 108;

type ExperienceDetailFooterProps = {
  visible: boolean;
  label: string;
  onPress: () => void;
  bottomInset: number;
};

/**
 * Sticky "Créer mon parcours" footer (polish pass, `docs/DECISIONS.md` D-49): always floats above the
 * Home Indicator/safe area, slides down and fades out while the user actively scrolls down, and comes
 * back the moment the scroll gesture ends or reverses (`useCtaVisibility`, independent of
 * `HomeHeader`/`RoamTabBar` per item 15). Same slide+fade shape as `HomeHeader`'s own visibility
 * animation, reduced-motion aware the same way.
 */
export function ExperienceDetailFooter({
  visible,
  label,
  onPress,
  bottomInset,
}: ExperienceDetailFooterProps) {
  const reduceMotion = useReduceMotion();

  return (
    <MotiView
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      animate={{
        opacity: visible ? 1 : 0,
        translateY: reduceMotion ? 0 : visible ? 0 : 32,
      }}
      transition={{ type: 'timing', duration: reduceMotion ? 120 : 260 }}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
    >
      <View
        className="border-t border-border bg-surface px-6 pt-3"
        style={{ paddingBottom: bottomInset + 12 }}
      >
        <Button label={label} trailingIcon={Sparkles} onPress={onPress} />
      </View>
    </MotiView>
  );
}
