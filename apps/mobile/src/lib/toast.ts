import RNToast from 'react-native-toast-message';

export type ToastVariant = 'success' | 'error';

export type ToastOptions = {
  title: string;
  /** Optional second line. */
  message?: string;
};

/**
 * Thin wrapper around `react-native-toast-message`'s imperative API: the rest of the app calls
 * `showToast`, never the library directly, so the underlying solution can change without touching
 * every call site. Renders through `AppToast` (`components/ui/`), mounted once at the app root.
 *
 * Only `success`/`error` are implemented (this sprint's actual need); extending to `warning`/`info`
 * later is adding a case here and to `AppToast`'s config, not a redesign.
 */
export function showToast(variant: ToastVariant, { title, message }: ToastOptions): void {
  RNToast.show({ type: variant, text1: title, text2: message });
}
