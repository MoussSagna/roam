import type { LucideIcon } from 'lucide-react-native';
import Compass from 'lucide-react-native/icons/compass';
import House from 'lucide-react-native/icons/house';
import Music2 from 'lucide-react-native/icons/music-2';
import Wine from 'lucide-react-native/icons/wine';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type HighlightsSectionProps = {
  highlights: readonly string[];
};

/** Decorative only (label carries the meaning, same convention as `moodAccents`): cycles through a
 * fixed, small icon set rather than modeling a per-highlight icon in the mock data. */
const ICONS: readonly LucideIcon[] = [Compass, Wine, Music2, House];

/** "À ne pas manquer" (sprint 5 §22): a small 2-column grid of the experience's own highlights. */
export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (highlights.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <Text variant="h3">{t('experience.highlights')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {highlights.map((highlight, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <View
              key={highlight}
              className="gap-2 rounded-card border border-border bg-surface p-3"
              style={{ width: '47%' }}
            >
              <Icon size={18} strokeWidth={1.8} color={colors.primary} />
              <Text variant="small" numberOfLines={2}>
                {highlight}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
