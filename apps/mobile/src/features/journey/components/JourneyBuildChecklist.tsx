import Check from 'lucide-react-native/icons/check';
import { MotiView } from 'moti';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type JourneyBuildLine = {
  key: string;
  label: string;
  /** Phase at which the line appears. */
  showAt: number;
  /** Phase at which its check appears (the same as `showAt` for what ROAM already knows). */
  doneAt: number;
};

type JourneyBuildChecklistProps = {
  lines: readonly JourneyBuildLine[];
  phase: number;
  reduceMotion: boolean;
};

const DOT = 20;

/**
 * The checklist of "On prépare ton parcours" (sprint 12, D-84): the same card and motion as the
 * onboarding's `ProfileChecklist` (lines slide in one by one, the check pops a beat later, the newest
 * line is highlighted), but its lines come from the journey draft ("Départ : République", "Ambiance
 * chill"…) and the last one waits as an empty ring until the journey is ready. `ProfileChecklist`
 * itself is tied to the onboarding's three fixed lines.
 */
export function JourneyBuildChecklist({ lines, phase, reduceMotion }: JourneyBuildChecklistProps) {
  const { colors } = useTheme();
  const shown = lines.filter((line) => phase >= line.showAt);
  const newest = shown.at(-1)?.key;

  return (
    <MotiView
      testID="journey-build-checklist"
      accessibilityLiveRegion="polite"
      animate={{ opacity: shown.length > 0 ? 1 : 0 }}
      transition={{ type: 'timing', duration: 400 }}
      // MotiView takes `style`, not `className`: the card is `text` at 4 % (RRGGBBAA), as in onboarding.
      style={{
        borderRadius: 20,
        backgroundColor: `${colors.text}0A`,
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
      }}
    >
      {lines.map((line) => {
        const visible = phase >= line.showAt;
        const done = phase >= line.doneAt;
        return (
          <MotiView
            key={line.key}
            testID={visible ? `build-line-${line.key}` : undefined}
            accessibilityElementsHidden={!visible}
            importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
            animate={{
              opacity: visible ? (line.key === newest || done ? 1 : 0.8) : 0,
              translateX: visible || reduceMotion ? 0 : -10,
              scale: line.key === newest && !reduceMotion ? 1.02 : 1,
            }}
            transition={{ type: 'timing', duration: 450 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <MotiView
              key={done ? 'done' : 'pending'}
              testID={
                visible
                  ? done
                    ? `build-done-${line.key}`
                    : `build-pending-${line.key}`
                  : undefined
              }
              from={visible && !reduceMotion ? { opacity: 0, scale: 0.6 } : undefined}
              animate={{ opacity: visible ? 1 : 0, scale: 1 }}
              transition={{ type: 'timing', duration: 320, delay: visible && done ? 200 : 0 }}
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.primary : 'transparent',
                borderWidth: done ? 0 : 1.5,
                borderColor: colors.primary,
              }}
            >
              {done ? <Check size={12} strokeWidth={3} color={colors.primaryForeground} /> : null}
            </MotiView>
            <Text
              variant="small"
              numberOfLines={1}
              className={line.key === newest ? 'flex-1 font-bodyMedium' : 'flex-1'}
            >
              {line.label}
            </Text>
          </MotiView>
        );
      })}
    </MotiView>
  );
}
