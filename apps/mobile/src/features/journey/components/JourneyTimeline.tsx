import { Fragment } from 'react';
import { View } from 'react-native';

import type { Experience, JourneyStep } from '@/types';

import { JourneyStepCard, type JourneyStepState } from './JourneyStepCard';
import { TravelConnector } from './TravelConnector';

type JourneyTimelineProps = {
  steps: readonly JourneyStep[];
  experiencesById: ReadonlyMap<string, Experience>;
  categoryLabelFor: (experience: Experience) => string | null;
  onPressExperience: (experience: Experience) => void;
  /** Per-step progress state (active journey); every step is `upcoming` when omitted. */
  stateFor?: (index: number) => JourneyStepState;
  /** Builder editing: reorder / remove by index. */
  onMove?: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
};

/**
 * Vertical journey timeline shared by the builder, the summary and the active journey: a
 * `JourneyStepCard` per step and a `TravelConnector` for each leg between two of them (the leg from the
 * start point to the first step is part of the stats, not drawn here).
 */
export function JourneyTimeline({
  steps,
  experiencesById,
  categoryLabelFor,
  onPressExperience,
  stateFor,
  onMove,
  onRemove,
}: JourneyTimelineProps) {
  return (
    <View testID="journey-timeline">
      {steps.map((step, index) => {
        const experience = experiencesById.get(step.experienceId);
        if (!experience) return null;
        return (
          <Fragment key={step.experienceId}>
            {index > 0 ? (
              <TravelConnector
                mode={step.travelMode}
                durationMin={step.travelDurationMin}
                distanceM={step.travelDistanceM}
              />
            ) : null}
            <JourneyStepCard
              step={step}
              experience={experience}
              categoryLabel={categoryLabelFor(experience)}
              state={stateFor?.(index)}
              onPress={onPressExperience}
              onMoveUp={onMove && index > 0 ? () => onMove(index, index - 1) : undefined}
              onMoveDown={
                onMove && index < steps.length - 1 ? () => onMove(index, index + 1) : undefined
              }
              onRemove={onRemove ? () => onRemove(index) : undefined}
            />
          </Fragment>
        );
      })}
    </View>
  );
}
