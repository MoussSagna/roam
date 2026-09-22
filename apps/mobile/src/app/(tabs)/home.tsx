import { HomeScreen } from '@/features/home/HomeScreen';
import { TabScreenTransition } from '@/features/navigation/TabScreenTransition';

export default function HomeRoute() {
  return (
    <TabScreenTransition>
      <HomeScreen />
    </TabScreenTransition>
  );
}
