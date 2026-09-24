import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

type ProfileAvatarProps = {
  displayName: string;
  avatarUrl?: string;
  size?: number;
};

/**
 * Circular avatar. No profile photo exists in the mock content, so it falls back to an initial
 * letter on an accent circle — the same precedent `ReviewCard` already uses for reviewer avatars
 * (no photo asset needed or invented). Shows `avatarUrl` once a real one exists.
 */
export function ProfileAvatar({ displayName, avatarUrl, size = 72 }: ProfileAvatarProps) {
  const { colors } = useTheme();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessible
        accessibilityIgnoresInvertColors
        accessibilityLabel={displayName}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={displayName}
      className="items-center justify-center rounded-pill bg-accent"
      style={{ width: size, height: size }}
    >
      <Text
        variant="h2"
        className="font-bodySemibold"
        style={{ color: colors.text }}
        accessible={false}
      >
        {displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
