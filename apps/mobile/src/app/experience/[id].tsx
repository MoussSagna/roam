import { useLocalSearchParams } from 'expo-router';

import { ExperienceDetailScreen } from '@/features/experiences/ExperienceDetailScreen';

export default function ExperienceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExperienceDetailScreen experienceId={id} />;
}
