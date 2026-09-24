import { useLocalSearchParams } from 'expo-router';

import { ActiveJourneyScreen } from '@/features/journey/ActiveJourneyScreen';

/** The created journey (sprint 10) — the one place an active journey is shown. */
export default function ActiveJourneyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActiveJourneyScreen journeyId={id} />;
}
