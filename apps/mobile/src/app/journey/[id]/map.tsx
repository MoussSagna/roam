import { useLocalSearchParams } from 'expo-router';

import { JourneyMapScreen } from '@/features/journey/JourneyMapScreen';

/** Full-screen map of the journey in progress (sprint 12), opened from the Parcours hub's mini-map. */
export default function JourneyMapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JourneyMapScreen journeyId={id} />;
}
