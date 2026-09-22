import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';

type AuthFooterLinkProps = {
  /** e.g. "Pas encore de compte ?" / "Déjà un compte ?" */
  prompt: string;
  /** e.g. "Créer un compte" / "Se connecter" */
  actionLabel: string;
  onPress: () => void;
};

/** "Pas encore de compte ? Créer un compte" — bottom cross-link between Login and Register. */
export function AuthFooterLink({ prompt, actionLabel, onPress }: AuthFooterLinkProps) {
  return (
    <View className="flex-row items-center justify-center gap-1">
      <Text variant="small" tone="secondary">
        {prompt}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onPress}
        hitSlop={8}
        className="active:opacity-60"
      >
        <Text variant="small" tone="primary" className="font-bodySemibold">
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
