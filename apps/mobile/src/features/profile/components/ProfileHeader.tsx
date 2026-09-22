import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { User } from '@/types';

import { ProfileAvatar } from './ProfileAvatar';

type ProfileHeaderProps = {
  user: User;
  onEditProfile: () => void;
};

/** Avatar, name, age/city, bio and the "Éditer mon profil" CTA (mockup tile 01). */
export function ProfileHeader({ user, onEditProfile }: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-4">
      <ProfileAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} />

      <View className="flex-1 gap-1.5 pt-0.5">
        <Text variant="h3">{user.displayName}</Text>
        {user.age !== undefined && user.city ? (
          <Text variant="small" tone="secondary">
            {t('profile.ageCity', { age: user.age, city: user.city })}
          </Text>
        ) : null}
        {user.bio ? (
          <Text variant="small" tone="secondary" numberOfLines={2}>
            {user.bio}
          </Text>
        ) : null}

        <Button
          label={t('profile.editProfile')}
          variant="secondary"
          onPress={onEditProfile}
          className="mt-2 self-start"
        />
      </View>
    </View>
  );
}
