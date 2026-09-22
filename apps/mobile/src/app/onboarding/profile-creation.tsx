import { Stack } from 'expo-router';

import { ProfileCreationScreen } from '@/features/onboarding/ProfileCreationScreen';

export default function ProfileCreationRoute() {
  return (
    <>
      <Stack.Screen options={{ animation: 'fade' }} />
      <ProfileCreationScreen />
    </>
  );
}
