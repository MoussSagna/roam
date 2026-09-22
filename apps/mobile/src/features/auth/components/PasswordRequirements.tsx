import Circle from 'lucide-react-native/icons/circle';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export const HAS_MIN_LENGTH = (password: string) => password.length >= 8;
export const HAS_LETTER_AND_NUMBER = (password: string) =>
  /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

type PasswordRequirementsProps = {
  password: string;
};

/**
 * Live checklist under the password field on the register screen (mockup: "Au moins 8
 * caractères", "Une lettre et un chiffre", "Un caractère spécial (optionnel)"). The special
 * character is explicitly optional in the mockup's own label, so it isn't required to submit —
 * see `HAS_MIN_LENGTH`/`HAS_LETTER_AND_NUMBER`, the two rules `RegisterScreen` actually enforces.
 */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const requirements = [
    { label: t('auth.register.requirementLength'), met: HAS_MIN_LENGTH(password) },
    { label: t('auth.register.requirementLetterNumber'), met: HAS_LETTER_AND_NUMBER(password) },
    { label: t('auth.register.requirementSpecial'), met: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <View style={{ gap: 8 }}>
      {requirements.map((requirement) => (
        <View key={requirement.label} className="flex-row items-center gap-2">
          {requirement.met ? (
            <CircleCheck size={18} strokeWidth={1.5} color={colors.primary} />
          ) : (
            <Circle size={18} strokeWidth={1.5} color={colors.border} />
          )}
          <Text variant="small" tone={requirement.met ? 'default' : 'secondary'}>
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
