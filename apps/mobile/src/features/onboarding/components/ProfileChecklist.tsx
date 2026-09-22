import Check from 'lucide-react-native/icons/check';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { PROFILE_STAGE, PROFILE_STEPS, type ProfileStage } from '../profileCreation';

type ProfileChecklistProps = {
  stage: ProfileStage;
  reduceMotion: boolean;
};

/**
 * The card of the profile creation: three lines that appear one after the other. A line slides in from the
 * left (text first, its check a moment later) and stays highlighted until the next one arrives.
 */
export function ProfileChecklist({ stage, reduceMotion }: ProfileChecklistProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const shownCount = Math.max(0, Math.min(PROFILE_STEPS.length, stage - PROFILE_STAGE.analyzing));
  const activeIndex = stage <= PROFILE_STAGE.thirdStep ? shownCount - 1 : -1;

  return (
    <MotiView
      accessibilityLiveRegion="polite"
      animate={{ opacity: shownCount > 0 ? 1 : 0 }}
      transition={{ type: 'timing', duration: 500 }}
      // MotiView takes `style`, not `className`: the card is `text` at 4 % (RRGGBBAA).
      style={{
        borderRadius: 20,
        backgroundColor: `${colors.text}0A`,
        paddingHorizontal: 29,
        paddingVertical: 15,
        gap: 11.5,
      }}
    >
      {PROFILE_STEPS.map((step, index) => {
        const shown = index < shownCount;
        const active = index === activeIndex;
        return (
          <MotiView
            key={step}
            animate={{
              opacity: shown ? (active || stage >= PROFILE_STAGE.done ? 1 : 0.8) : 0,
              translateX: shown || reduceMotion ? 0 : -10,
              scale: active && !reduceMotion ? 1.02 : 1,
            }}
            transition={{ type: 'timing', duration: 500 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <MotiView
              animate={{ opacity: shown ? 1 : 0, scale: shown || reduceMotion ? 1 : 0.6 }}
              transition={{ type: 'timing', duration: 350, delay: shown ? 250 : 0 }}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
              }}
            >
              <Check size={12} strokeWidth={3} color={colors.primaryForeground} />
            </MotiView>
            <Text
              variant="small"
              style={{ fontSize: 12 }}
              className={active ? 'font-bodyMedium' : ''}
            >
              {t(`onboarding.profile.${step}`)}
            </Text>
          </MotiView>
        );
      })}
    </MotiView>
  );
}
