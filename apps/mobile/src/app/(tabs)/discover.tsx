import { DiscoverScreen } from '@/features/discover/DiscoverScreen';
import { TabScreenTransition } from '@/features/navigation/TabScreenTransition';

export default function DiscoverRoute() {
  return (
    <TabScreenTransition>
      <DiscoverScreen />
    </TabScreenTransition>
  );
}
