import { TabScreenTransition } from '@/features/navigation/TabScreenTransition';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

export default function ProfileRoute() {
  return (
    <TabScreenTransition>
      <ProfileScreen />
    </TabScreenTransition>
  );
}
