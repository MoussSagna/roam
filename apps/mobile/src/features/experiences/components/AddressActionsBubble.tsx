import X from 'lucide-react-native/icons/x';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
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
 * backdrop, listing the actions as full-width pills. Same `Modal` + backdrop + `MotiView` plumbing as
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
              <View className="flex-row items-start gap-3">
                <View className="flex-1 gap-1">
                  <Text variant="h4" accessibilityRole="header">
                    {t('experience.addressActions.title')}
                  </Text>
                  <Text variant="small" tone="secondary" numberOfLines={2}>
                    {address}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onClose}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center active:opacity-60"
                >
                  <X size={18} strokeWidth={1.8} color={colors.textSecondary} />
                </Pressable>
              </View>

              {actions.map((action) => (
                <Button
                  key={action.key}
                  label={action.label}
                  variant="secondary"
                  leadingIcon={<action.icon size={18} strokeWidth={1.8} color={colors.text} />}
                  onPress={action.onPress}
                  className="w-full"
                />
              ))}
            </MotiView>
          </Pressable>
        </Pressable>
      </MotiView>
    </Modal>
  );
}
