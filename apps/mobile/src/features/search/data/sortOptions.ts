import type { LucideIcon } from 'lucide-react-native';
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import MapPin from 'lucide-react-native/icons/map-pin';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';

import type { SearchSortOption } from '@/types';

/** The five sort options (sprint 8 §4 minimum list), in the order `SearchSortSheet` lists them. Each
 * option's label is `search.sort.options.<value>` — kept out of this file so the sheet stays the only
 * place that touches `useTranslation`. */
export const SORT_OPTIONS: readonly { value: SearchSortOption; icon: LucideIcon }[] = [
  { value: 'recommended', icon: Sparkles },
  { value: 'nearest', icon: MapPin },
  { value: 'topRated', icon: Star },
  { value: 'priceAsc', icon: ArrowUp },
  { value: 'priceDesc', icon: ArrowDown },
];
