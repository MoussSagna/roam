import { MotiView } from 'moti';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/useReduceMotion';

import { Button, type ButtonProps } from './Button';

/** Approximate rendered height (button + its own paddings): screens add this to their scroll
 * container's bottom padding so the last section is never hidden behind the floating bar. */
export const STICKY_FOOTER_CLEARANCE = 108;

export type StickyActionFooterProps = {
  visible: boolean;
  label: string;
  onPress: () => void;
  icon?: ButtonProps['trailingIcon'];
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonProps['variant'];
};

/**
 * Sticky action-button footer shared by every screen with one floating primary CTA — introduced for
 * experience detail's "Créer mon parcours" (`docs/DECISIONS.md` D-49), reused as-is for Preferences'
 * "Enregistrer mes préférences" (D-52). Owns positioning, safe area, spacing, surface and animation;
 * the screen owns what `visible` means (typically `useCtaVisibility`) and what the button does.
 */
export function StickyActionFooter({
  visible,
  label,
  onPress,
  icon,
  disabled,
  loading,
  variant,
}: StickyActionFooterProps) {
  const insets = useSafeAreaInsets();
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
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={label}
          variant={variant}
          trailingIcon={icon}
          disabled={disabled}
          loading={loading}
          onPress={onPress}
        />
      </View>
    </MotiView>
  );
}
