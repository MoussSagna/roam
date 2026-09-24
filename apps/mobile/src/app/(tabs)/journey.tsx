import { JourneyHubScreen } from '@/features/journey/JourneyHubScreen';
import { TabScreenTransition } from '@/features/navigation/TabScreenTransition';

/** The Parcours tab (sprint 11): the journey hub. `/journey/[id]` and `/journey/create` stay root
 * stack screens, above the tabs. */
export default function JourneyRoute() {
  return (
    <TabScreenTransition>
      <JourneyHubScreen />
    </TabScreenTransition>
  );
}
