import X from 'lucide-react-native/icons/x';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/theme';

import type { AddressAction } from '../useAddressActions';

/** Same exit handling as `ConfirmationModal`: the RN `Modal` stays mounted this long after `visible`
 * turns false so the fade/scale-out actually plays. */
const EXIT_DURATION_MS = 180;

type AddressActionsBubbleProps = {
  visible: boolean;
  address: string;
  actions: readonly AddressAction[];
  onClose: () => void;
};

/**
 * The small action bubble opened by tapping the address (D-74): a centered rounded card over a dimmed
 * backdrop, listing the actions as full-width, left-aligned single-line pills (small type so the longest label fits); the title and address are centered. Same `Modal` + backdrop + `MotiView` plumbing as
 * `ConfirmationModal`/the search sheets (fade + slight scale, no motion under reduced motion), padded
 * by the safe-area insets, closed by the backdrop, the "×" or Android back. It owns no behavior of its
 * own — the actions come from `useAddressActions`.
 */
export function AddressActionsBubble({
  visible,
  address,
  actions,
  onClose,
}: AddressActionsBubbleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const [lastVisible, setLastVisible] = useState(visible);

  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setShouldRender(true);
    }
  }

  useEffect(() => {
    if (visible) return;
    const timeout = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ type: 'timing', duration: reduceMotion ? 0 : EXIT_DURATION_MS }}
        style={{ flex: 1 }}
      >
        <Pressable
          accessibilityRole="none"
          onPress={onClose}
          className="flex-1 items-center justify-center bg-overlay/40 px-6"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {/* Swallows the press so tapping the bubble itself doesn't also close it. */}
          <Pressable onPress={() => {}}>
            <MotiView
              from={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.92,
                translateY: reduceMotion ? 0 : 12,
              }}
              animate={{
                opacity: visible ? 1 : 0,
                scale: visible || reduceMotion ? 1 : 0.92,
                translateY: visible || reduceMotion ? 0 : 12,
              }}
              transition={{ type: 'timing', duration: reduceMotion ? 0 : EXIT_DURATION_MS }}
              accessibilityViewIsModal
              testID="address-actions-bubble"
              style={{ width: 320 }}
              className="gap-3 rounded-hero border border-border bg-surface p-4"
            >
              <View className="items-center gap-1 px-8 pt-1">
                <Text variant="h4" accessibilityRole="header" className="text-center">
                  {t('experience.addressActions.title')}
                </Text>
                <Text variant="small" tone="secondary" numberOfLines={2} className="text-center">
                  {address}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onClose}
                  hitSlop={8}
                  className="absolute right-0 top-0 h-8 w-8 items-center justify-center active:opacity-60"
                >
                  <X size={18} strokeWidth={1.8} color={colors.textSecondary} />
                </Pressable>
              </View>

              {actions.map((action) => (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={action.onPress}
                  className="min-h-12 flex-row items-center gap-3 rounded-pill border border-border bg-surface px-4 active:opacity-70"
                >
                  <action.icon size={18} strokeWidth={1.8} color={colors.text} />
                  <Text
                    variant="small"
                    numberOfLines={1}
                    className="flex-1 text-left font-bodyMedium"
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </MotiView>
          </Pressable>
        </Pressable>
      </MotiView>
    </Modal>
  );
}
