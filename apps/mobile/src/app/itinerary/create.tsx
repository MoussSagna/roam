import { useLocalSearchParams } from 'expo-router';

import { CreateJourneyPlaceholder } from '@/features/itinerary/CreateJourneyPlaceholder';

export default function CreateJourneyRoute() {
  const { experienceId } = useLocalSearchParams<{ experienceId?: string }>();
  return <CreateJourneyPlaceholder experienceId={experienceId} />;
}
