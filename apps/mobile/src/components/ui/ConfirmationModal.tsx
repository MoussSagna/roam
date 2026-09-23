import type { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { Button } from './Button';
import { Text } from './Text';

/** How long the exit animation runs — the underlying RN `Modal` stays mounted for this long after
 * `visible` turns `false`, so the fade/scale-out actually gets to play instead of the modal just
 * vanishing. */
const EXIT_DURATION_MS = 180;

export type ConfirmationModalVariant = 'default' | 'destructive';

export type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Tints the icon and the confirm button (`destructive` = `error`, `default` = `primary`). */
  variant?: ConfirmationModalVariant;
  /** Shows a spinner on the confirm button and disables both buttons, for an async confirm action. */
  loading?: boolean;
  /** Decorative icon shown in a tinted circle above the title. Omit for a text-only dialog. */
  icon?: LucideIcon;
  /** Called once the dialog has fully left the screen (exit animation done, native `Modal` gone).
   * For a confirm action that tears down the screen rendering this dialog (logout): run it here,
   * not in `onConfirm` — a native `Modal` whose screen is removed while it is still presented stays
   * frozen on iOS, with dead buttons (D-78). */
  onExited?: () => void;
};

/**
 * Generic confirmation dialog (`docs/DECISIONS.md`) — a centered card, not a bottom sheet: the
 * reference design shows visible margins on every side, not a sheet flush to the bottom edge. First
 * use is the logout confirmation (`ProfileScreen`), configured through props; this component owns no
 * logout/session logic itself — that stays in the screen that renders it (`onConfirm`/`onCancel` are
 * plain callbacks).
 */
export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  icon: Icon,
  onExited,
}: ConfirmationModalProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const [lastVisible, setLastVisible] = useState(visible);
  const isDestructive = variant === 'destructive';
  const tint = isDestructive ? colors.error : colors.primary;

  // `visible` turning true must mount the modal immediately (adjusting state during render, not in
  // an effect, is React's own documented way to do this without an extra render's flash of nothing —
  // see "Adjusting state when a prop changes"). Turning false instead keeps it mounted for
  // `EXIT_DURATION_MS` so the exit animation below actually gets to play.
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) {
      setShouldRender(true);
    }
  }

  useEffect(() => {
    if (visible) {
      return;
    }
    const timeout = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [visible]);

  // Fired after the commit that unmounted the `Modal`, so the native dialog is really dismissed.
  const onExitedRef = useRef(onExited);
  useLayoutEffect(() => {
    onExitedRef.current = onExited;
  });
  const wasRenderedRef = useRef(shouldRender);
  useEffect(() => {
    if (wasRenderedRef.current && !shouldRender) onExitedRef.current?.();
    wasRenderedRef.current = shouldRender;
  }, [shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onCancel}
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
          onPress={onCancel}
          className="flex-1 items-center justify-center bg-overlay/40 px-6"
        >
          {/* Swallows the press so tapping the card itself doesn't also trigger `onCancel`. */}
          <Pressable onPress={() => {}}>
            <MotiView
              from={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.92,
                translateY: reduceMotion ? 0 : 16,
              }}
              animate={{
                opacity: visible ? 1 : 0,
                scale: visible || reduceMotion ? 1 : 0.92,
                translateY: visible || reduceMotion ? 0 : 16,
              }}
              transition={{ type: 'timing', duration: reduceMotion ? 0 : EXIT_DURATION_MS }}
              accessibilityViewIsModal
              style={{ width: 320 }}
              className="items-center gap-5 rounded-hero bg-surface px-6 py-6"
            >
              <View className="h-1 w-10 rounded-pill bg-border" />

              {Icon ? (
                <View
                  className={cx(
                    'h-16 w-16 items-center justify-center rounded-pill',
                    isDestructive ? 'bg-error/10' : 'bg-primary/10',
                  )}
                >
                  <Icon size={28} strokeWidth={1.8} color={tint} />
                </View>
              ) : null}

              <View className="gap-2">
                <Text
                  accessibilityRole="header"
                  className="text-center"
                  style={{ fontFamily: fontFamily.editorialSemibold, fontSize: 24 }}
                >
                  {title}
                </Text>
                {description ? (
                  <Text variant="body" tone="secondary" className="text-center">
                    {description}
                  </Text>
                ) : null}
              </View>

              <View className="w-full gap-3">
                <Button
                  label={confirmLabel}
                  variant={isDestructive ? 'destructive' : 'primary'}
                  onPress={onConfirm}
                  loading={loading}
                  className="w-full"
                />
                <Button
                  label={cancelLabel}
                  variant="secondary"
                  onPress={onCancel}
                  disabled={loading}
                  className="w-full"
                />
              </View>
            </MotiView>
          </Pressable>
        </Pressable>
      </MotiView>
    </Modal>
  );
}
