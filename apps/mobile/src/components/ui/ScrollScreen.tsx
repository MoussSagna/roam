import type { ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cx } from '@/lib/cx';

type ScrollScreenProps = {
  children: ReactNode;
  className?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Lets a screen grab its own `ScrollView` in tests (e.g. to fire scroll events). */
  testID?: string;
};

/** Themed, safe-area aware, scrollable page container (the `Screen` primitive's scrollable sibling). */
export function ScrollScreen({
  children,
  className,
  contentContainerStyle,
  onScroll,
  testID,
}: ScrollScreenProps) {
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          testID={testID}
          className={cx('flex-1 px-6', className)}
          contentContainerStyle={[{ paddingBottom: 40 }, contentContainerStyle]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
