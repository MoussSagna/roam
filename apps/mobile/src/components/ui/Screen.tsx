import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cx } from '@/lib/cx';

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

/** Themed, safe-area aware page container. Screens compose their content inside it. */
export function Screen({ children, className }: ScreenProps) {
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <View className={cx('flex-1 px-6', className)}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
