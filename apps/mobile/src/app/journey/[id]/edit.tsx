import { useLocalSearchParams } from 'expo-router';

import { JourneyEditScreen } from '@/features/journey/JourneyEditScreen';

/** Editing the journey in progress (sprint 12), opened by "Modifier" on `/journey/[id]`. */
export default function JourneyEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JourneyEditScreen journeyId={id} />;
}
