import { BlurView } from 'expo-blur';
import Bell from 'lucide-react-native/icons/bell';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

const HEADER_HEIGHT = 56;

type HomeHeaderProps = {
  /** From `useScrollDirection` (owned by `HomeScreen`) — independent of `TabBarCollapseContext`. */
  visible: boolean;
  /** True at the very top of the page: the header's background fades out so the Hero shows through
   * with nothing behind the bell, instead of the blur/wash it gets once the page has scrolled. */
  atTop: boolean;
  topInset: number;
  onPressNotifications: () => void;
};

/**
 * Minimal floating header above the Hero (sprint 4 polish): only the notification bell — no name,
 * avatar, logo or search bar (§6). Transparent/blurred so the Hero photo stays the focal point (§12),
 * and hides/reveals with scroll direction independently of `RoamTabBar` (§13). At the very top the
 * blur/wash itself fades out (not just becomes see-through — it stops rendering), leaving only the
 * bell over the bare Hero photo.
 */
export function HomeHeader({ visible, atTop, topInset, onPressNotifications }: HomeHeaderProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <MotiView
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      animate={{
        opacity: visible ? 1 : 0,
        translateY: reduceMotion ? 0 : visible ? 0 : -HEADER_HEIGHT,
      }}
      transition={{ type: 'timing', duration: reduceMotion ? 150 : 260 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <View style={{ height: HEADER_HEIGHT + topInset }}>
        <MotiView
          pointerEvents="none"
          animate={{ opacity: atTop ? 0 : 1 }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 220 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={{ flex: 1 }} />
        </MotiView>

        <View
          style={{
            height: '100%',
            paddingTop: topInset,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.notifications')}
            onPress={onPressNotifications}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-black/25 active:opacity-80"
          >
            <Bell size={20} strokeWidth={1.8} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </MotiView>
  );
}
