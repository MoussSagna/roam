import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import X from 'lucide-react-native/icons/x';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { ProgressBars } from '@/features/onboarding/components/ProgressBars';
import { useTheme } from '@/theme';

/** Steps of the creation flow drawn by the progress bars (context ×3, location, suggestions, builder,
 * summary). */
export const JOURNEY_FLOW_STEPS = 7;

type JourneyFlowHeaderProps = {
  onBack: () => void;
  /** Leaves the whole flow (asks first when something was entered — the screen decides). */
  onClose?: () => void;
  /** 0-based position in the flow; no bars when omitted. */
  step?: number;
};

/**
 * Top bar of the journey creation flow: back (one step), the onboarding's segmented progress bars
 * (reused — same "one question at a time" rhythm), and a close button to leave the flow.
 */
export function JourneyFlowHeader({ onBack, onClose, step }: JourneyFlowHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="h-14 flex-row items-center justify-between">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={onBack}
        hitSlop={12}
        className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
      >
        <ChevronLeft size={26} strokeWidth={1.5} color={colors.text} />
      </Pressable>

      {step !== undefined ? <ProgressBars count={JOURNEY_FLOW_STEPS} index={step} /> : <View />}

      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('journey.close')}
          onPress={onClose}
          hitSlop={12}
          className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
        >
          <X size={22} strokeWidth={1.5} color={colors.text} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}
    </View>
  );
}
