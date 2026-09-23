import { BlurView } from 'expo-blur';
import Bell from 'lucide-react-native/icons/bell';
import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

/** Exported so `HomeScreen` can compute where the search row should finish revealing without
 * duplicating this number (sprint 6 "sticky search", D-69). */
export const HEADER_HEIGHT = 56;
/** Height of the optional search row (sprint 6 "sticky search", D-69) — matches `SearchBar`'s own
 * `min-h-14` (56px) plus the row's vertical padding. */
const SEARCH_ROW_HEIGHT = 56;
const SEARCH_ROW_PADDING = 12;

type HomeHeaderProps = {
  /** From `useScrollDirection` (owned by `HomeScreen`) — independent of `TabBarCollapseContext`. */
  visible: boolean;
  /** True at the very top of the page: the header's background fades out so the Hero shows through
   * with nothing behind the bell, instead of the blur/wash it gets once the page has scrolled. */
  atTop: boolean;
  topInset: number;
  onPressNotifications: () => void;
  /** Content for the optional second row (a `SearchBar`) — merges Home's sticky search into this same
   * floating zone instead of a second, separate one (sprint 6 "sticky search" brief §2, D-69). Omit
   * for the original bell-only header. */
  searchSlot?: ReactNode;
  /** Reveals `searchSlot` (smooth height/opacity grow, not an instant snap) once scrolled past the
   * Hero — independent of `visible`/`atTop`: the whole zone still hides/reveals with scroll direction
   * as one piece; this only gates whether the search row exists within it. */
  showSearch?: boolean;
};

/**
 * Floating header above the Hero (sprint 4 polish; sprint 6 adds an optional search row, D-69):
 * notification bell — no name, avatar or logo (§6) — plus, once scrolled past the Hero, the search
 * bar. Transparent/blurred so the Hero photo stays the focal point (§12), and the whole zone
 * hides/reveals with scroll direction independently of `RoamTabBar` (§13) — unchanged from before:
 * the search row rides along with the bell, it does not hide/reveal on its own. At the very top the
 * blur/wash itself fades out (not just becomes see-through — it stops rendering), leaving only the
 * bell over the bare Hero photo.
 */
export function HomeHeader({
  visible,
  atTop,
  topInset,
  onPressNotifications,
  searchSlot,
  showSearch = false,
}: HomeHeaderProps) {
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
          height: HEADER_HEIGHT + topInset,
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

      {searchSlot ? (
        <MotiView
          animate={{
            height: showSearch ? SEARCH_ROW_HEIGHT + SEARCH_ROW_PADDING : 0,
            opacity: showSearch ? 1 : 0,
          }}
          transition={{ type: 'timing', duration: reduceMotion ? 0 : 220 }}
          pointerEvents={showSearch ? 'box-none' : 'none'}
          style={{ overflow: 'hidden' }}
        >
          <View
            style={{
              height: SEARCH_ROW_HEIGHT + SEARCH_ROW_PADDING,
              paddingBottom: SEARCH_ROW_PADDING,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            {searchSlot}
          </View>
        </MotiView>
      ) : null}
    </MotiView>
  );
}
