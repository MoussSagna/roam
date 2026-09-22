import { useLocalSearchParams } from 'expo-router';

import { ExperienceDetailPlaceholder } from '@/features/experiences/ExperienceDetailPlaceholder';

export default function ExperienceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExperienceDetailPlaceholder experienceId={id} />;
}
