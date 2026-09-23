import { useLocalSearchParams } from 'expo-router';

import { ExperienceMapScreen } from '@/features/map/ExperienceMapScreen';

/** Full-screen map of one experience, opened from Experience detail's map block (D-73) — a flat
 * `experience-map/[id]` route, like `gallery/[id]` (D-48). */
export default function ExperienceMapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExperienceMapScreen experienceId={id} />;
}
