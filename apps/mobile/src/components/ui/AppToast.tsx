import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleX from 'lucide-react-native/icons/circle-x';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNToast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import { Text } from './Text';

const VISIBILITY_TIME_MS = 3500;

type ToastCardVariant = 'success' | 'error';

type ToastCardProps = {
  variant: ToastCardVariant;
  text1?: string;
  text2?: string;
};

/** ROAM-styled card: icon + title (+ optional second line), on `surfaceElevated`. Reused for both
 * `success` and `error` — only the icon/tint differs. */
function ToastCard({ variant, text1, text2 }: ToastCardProps) {
  const { colors } = useTheme();
  const Icon = variant === 'success' ? CircleCheck : CircleX;
  const tint = variant === 'success' ? colors.success : colors.error;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join('. ')}
      className="mx-6 flex-row items-start gap-3 self-center rounded-large border border-border bg-surfaceElevated px-4 py-3.5"
      style={{
        maxWidth: 420,
        width: '100%',
        shadowColor: colors.overlay,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <Icon size={20} strokeWidth={2} color={tint} style={{ marginTop: 1 }} />
      <View className="flex-1 gap-0.5">
        {text1 ? <Text variant="label">{text1}</Text> : null}
        {text2 ? (
          <Text variant="small" tone="secondary">
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard variant="success" text1={text1} text2={text2} />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard variant="error" text1={text1} text2={text2} />
  ),
};

/**
 * Global toast host (`showToast`, `lib/toast.ts`) — mounted once at the app root (`app/_layout.tsx`),
 * not per-screen. Always docks at the top, clear of the safe area: every bottom-anchored floating
 * element in this app (`RoamTabBar`, `StickyActionFooter`) would otherwise be a collision risk, and
 * top has none. `swipeable` (the library's own gesture) still lets a toast be dismissed early without
 * fighting the Stack's own back gesture — it's an internal pan responder on the toast card itself, not
 * a screen-edge gesture (`docs/DECISIONS.md` D-53's "internal gestures are unaffected").
 */
export function AppToast() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <RNToast
      config={toastConfig}
      position="top"
      topOffset={insets.top + 12}
      visibilityTime={VISIBILITY_TIME_MS}
      animationConfig={reduceMotion ? { type: 'timing', duration: 120 } : undefined}
    />
  );
}
