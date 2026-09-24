import { useLocalSearchParams } from 'expo-router';

import { JourneyFeedbackScreen } from '@/features/journey/JourneyFeedbackScreen';

/** Feedback on a completed journey (sprint 12), opened by "Terminer mon parcours". */
export default function JourneyFeedbackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JourneyFeedbackScreen journeyId={id} />;
}
