import { FavoritesScreen } from '@/features/favorites/FavoritesScreen';
import { TabScreenTransition } from '@/features/navigation/TabScreenTransition';

export default function FavoritesRoute() {
  return (
    <TabScreenTransition>
      <FavoritesScreen />
    </TabScreenTransition>
  );
}
